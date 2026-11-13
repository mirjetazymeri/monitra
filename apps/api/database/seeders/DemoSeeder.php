<?php

namespace Database\Seeders;

use App\Enums\CheckErrorCategory;
use App\Enums\EndpointStatus;
use App\Models\Endpoint;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeds a local demo account with two kinds of endpoints:
 *
 *  - LIVE endpoints (real public URLs, no history). The scheduler checks them for
 *    real, so every result they show is a genuine measurement.
 *  - DEMO endpoints (reserved `.example` domains that can never resolve) with seven
 *    days of SIMULATED history. They are flagged `is_demo`, every result is flagged
 *    `is_simulated`, they are never checked live, and the UI labels them "Demo".
 */
class DemoSeeder extends Seeder
{
    private const DAYS = 7;

    private const STEP_MINUTES = 10;

    public function run(): void
    {
        $email = (string) config('monitra.demo.email');
        $password = (string) config('monitra.demo.password');
        $user = User::query()->where('email', $email)->first();
        $generated = null;

        if ($user === null) {
            $generated = $password === '' ? Str::password(16, symbols: false) : null;
            $user = User::query()->create([
                'name' => 'Demo Operator',
                'email' => $email,
                'password' => $generated ?? $password,
            ]);
        } elseif ($password !== '') {
            // Keep the account in sync with DEMO_USER_PASSWORD; never regenerate an existing password.
            $user->forceFill(['password' => $password])->save();
        }

        // Re-seeding is non-destructive: only the simulated demo endpoints (and, by cascade,
        // their simulated history) are replaced. Live endpoints and their real checks are kept.
        $user->endpoints()->where('is_demo', true)->delete();

        $this->seedLiveEndpoints($user);
        $this->seedDemoEndpoints($user);

        $this->command?->info("Demo account: {$email}".match (true) {
            $generated !== null => " / generated password: {$generated}",
            $password !== '' => ' (password from DEMO_USER_PASSWORD)',
            default => ' (existing password kept)',
        });
    }

    private function seedLiveEndpoints(User $user): void
    {
        $live = [
            ['Example Domain', 'https://example.com/', 200, 300],
            ['GitHub REST API', 'https://api.github.com/', 200, 300],
            ['Cloudflare 1.1.1.1', 'https://one.one.one.one/', 200, 600],
            // Deliberately expects 200 from an endpoint that returns 503, to demonstrate a real incident.
            ['HTTPBin (expects 200, returns 503)', 'https://httpbin.org/status/503', 200, 900],
        ];

        foreach ($live as [$name, $url, $expected, $interval]) {
            // Only add sample live endpoints that are not already registered.
            if ($user->endpoints()->where('is_demo', false)->where('url', $url)->exists()) {
                continue;
            }

            $endpoint = $user->endpoints()->create([
                'name' => $name,
                'url' => $url,
                'expected_status' => $expected,
                'check_interval' => $interval,
                'is_enabled' => true,
            ]);
            $endpoint->forceFill(['next_check_at' => now()])->save();
        }
    }

    private function seedDemoEndpoints(User $user): void
    {
        mt_srand(20261113);

        $now = now()->startOfMinute();

        // [name, url, base latency ms, jitter ms, incident windows [minutesAgo, durationMinutes|null, category, status]]
        $profiles = [
            ['Payments API', 'https://api.acme-payments.example/health', 180, 60, [
                [3 * 1440 + 300, 40, CheckErrorCategory::StatusMismatch, 502],
            ]],
            ['Auth Service', 'https://auth.acme-cloud.example/healthz', 85, 25, []],
            ['Storefront', 'https://shop.acme-store.example/', 320, 120, [
                [5 * 1440 + 120, 30, CheckErrorCategory::Timeout, null],
                [1440 + 600, 20, CheckErrorCategory::StatusMismatch, 500],
            ]],
            ['Search API', 'https://search.acme-cloud.example/status', 450, 220, [
                [2 * 1440 + 900, 60, CheckErrorCategory::Timeout, null],
                [420, 20, CheckErrorCategory::StatusMismatch, 503],
            ]],
            ['CDN Assets', 'https://cdn.acme-static.example/ping.txt', 40, 15, []],
            // Ongoing incident: down for the last 90 minutes.
            ['Legacy Reports', 'https://reports.acme-legacy.example/api/ping', 650, 200, [
                [90, null, CheckErrorCategory::ConnectionFailed, null],
            ]],
        ];

        foreach ($profiles as [$name, $url, $base, $jitter, $windows]) {
            /** @var Endpoint $endpoint */
            $endpoint = $user->endpoints()->create([
                'name' => $name,
                'url' => $url,
                'expected_status' => 200,
                'check_interval' => self::STEP_MINUTES * 60,
                'is_enabled' => true,
            ]);

            $rows = [];
            $incidents = [];
            $lastSuccess = true;

            for ($minutesAgo = self::DAYS * 1440; $minutesAgo >= 0; $minutesAgo -= self::STEP_MINUTES) {
                $at = $now->copy()->subMinutes($minutesAgo);
                $window = $this->activeWindow($windows, $minutesAgo);

                if ($window !== null) {
                    [, , $category, $status] = $window;
                    $responseTime = $category === CheckErrorCategory::Timeout ? 10_000 : ($status !== null ? $base + mt_rand(0, $jitter) : null);
                    $rows[] = $this->row($endpoint->id, $status, $responseTime, false, $category, $at);
                    $key = $window[0];
                    $incidents[$key] ??= ['started_at' => $at, 'category' => $category, 'status' => $status, 'failed' => 0, 'open' => $window[1] === null];
                    $incidents[$key]['failed']++;
                    $incidents[$key]['resolved_at'] = null;
                    $lastSuccess = false;

                    continue;
                }

                // Close the incident on the first healthy check after a window.
                if (! $lastSuccess) {
                    $lastKey = array_key_last($incidents);
                    $incidents[$lastKey]['resolved_at'] = $at;
                }

                $hour = (int) $at->format('G');
                $dailyLoad = 1 + 0.25 * sin(($hour - 8) / 24 * 2 * M_PI);
                $spike = mt_rand(1, 100) <= 2 ? mt_rand(2, 4) : 1;
                $latency = (int) round(($base + mt_rand(-$jitter, $jitter) / 2) * $dailyLoad * $spike);

                $rows[] = $this->row($endpoint->id, 200, max(5, $latency), true, null, $at);
                $lastSuccess = true;
            }

            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('check_results')->insert($chunk);
            }

            foreach ($incidents as $incident) {
                DB::table('incidents')->insert([
                    'endpoint_id' => $endpoint->id,
                    'state' => $incident['open'] ? 'open' : 'resolved',
                    'started_at' => $incident['started_at'],
                    'resolved_at' => $incident['open'] ? null : $incident['resolved_at'],
                    'error_category' => $incident['category']->value,
                    'status_code' => $incident['status'],
                    'failed_checks' => $incident['failed'],
                    'is_simulated' => true,
                    'created_at' => $incident['started_at'],
                    'updated_at' => $now,
                ]);
            }

            $endpoint->forceFill([
                'is_demo' => true,
                'current_status' => $lastSuccess ? EndpointStatus::Up : EndpointStatus::Down,
                'last_checked_at' => $now,
                'next_check_at' => null,
            ])->save();
        }
    }

    /**
     * @param  list<array{0: int, 1: int|null, 2: CheckErrorCategory, 3: int|null}>  $windows
     * @return array{0: int, 1: int|null, 2: CheckErrorCategory, 3: int|null}|null
     */
    private function activeWindow(array $windows, int $minutesAgo): ?array
    {
        foreach ($windows as $window) {
            [$start, $duration] = $window;
            $end = $duration === null ? -1 : $start - $duration;

            if ($minutesAgo <= $start && $minutesAgo > $end) {
                return $window;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function row(int $endpointId, ?int $status, ?int $responseTime, bool $success, ?CheckErrorCategory $category, Carbon $at): array
    {
        return [
            'endpoint_id' => $endpointId,
            'status_code' => $status,
            'response_time_ms' => $responseTime,
            'is_success' => $success,
            'error_category' => $category?->value,
            'is_simulated' => true,
            'checked_at' => $at,
        ];
    }
}
