<?php

namespace App\Services;

use App\Models\CheckResult;
use App\Models\Endpoint;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Aggregations over recorded checks. All availability figures are observed,
 * check-based values computed only from persisted check results.
 */
class MetricsService
{
    /** Supported ranges: [duration in seconds, bucket size in seconds]. */
    public const RANGES = [
        '24h' => [86_400, 3_600],
        '7d' => [604_800, 21_600],
    ];

    /** Data sources: live measurements only (default) or live + simulated demo data. */
    public const SOURCES = ['live', 'all'];

    /**
     * Endpoints of the user that belong to the requested data source.
     *
     * @return Builder<Endpoint>
     */
    public function endpointsFor(User $user, string $source): Builder
    {
        return $user->endpoints()->getQuery()->when($source === 'live', fn (Builder $q) => $q->where('is_demo', false));
    }

    /**
     * @return array<string, mixed>
     */
    public function dashboard(User $user, string $range, string $source = 'live'): array
    {
        [$from, $bucket] = $this->window($range);

        $endpointIds = $this->endpointsFor($user, $source)->select('id');

        $statusCounts = $this->endpointsFor($user, $source)
            ->selectRaw("CASE WHEN is_enabled = 0 THEN 'paused' ELSE current_status END AS status, COUNT(*) AS aggregate")
            ->groupBy('status')
            ->toBase()
            ->get()
            ->pluck('aggregate', 'status');

        // Simulated results never count towards live figures, even if mis-flagged at endpoint level.
        $checks = fn () => CheckResult::query()
            ->whereIn('endpoint_id', $endpointIds)
            ->when($source === 'live', fn (Builder $q) => $q->where('is_simulated', false));

        $summary = $this->summary($checks(), $from);

        return [
            'range' => $range,
            'source' => $source,
            'generated_at' => now()->toIso8601String(),
            'endpoints' => [
                'total' => (int) $statusCounts->sum(),
                'up' => (int) ($statusCounts['up'] ?? 0),
                'down' => (int) ($statusCounts['down'] ?? 0),
                'pending' => (int) ($statusCounts['pending'] ?? 0),
                'paused' => (int) ($statusCounts['paused'] ?? 0),
            ],
            'checks' => $summary,
            'open_incidents' => DB::table('incidents')->whereIn('endpoint_id', $endpointIds)->where('state', 'open')->count(),
            'includes_demo_data' => $user->endpoints()->where('is_demo', true)->exists(),
            'series' => $this->series($checks(), $from, $bucket),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function endpoint(Endpoint $endpoint, string $range): array
    {
        [$from, $bucket] = $this->window($range);

        return [
            'range' => $range,
            'checks' => $this->summary($endpoint->checks()->getQuery(), $from),
            'series' => $this->series($endpoint->checks()->getQuery(), $from, $bucket),
        ];
    }

    /**
     * @param  Builder<CheckResult>  $query
     * @return array{total: int, successful: int, failed: int, uptime_percent: float|null, avg_response_ms: int|null}
     */
    private function summary(Builder $query, Carbon $from): array
    {
        $row = $query->where('checked_at', '>=', $from)
            ->selectRaw('COUNT(*) AS total')
            ->selectRaw('SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) AS successful')
            ->selectRaw('AVG(CASE WHEN status_code IS NOT NULL THEN response_time_ms END) AS avg_response')
            ->toBase()
            ->first();

        $total = (int) ($row->total ?? 0);
        $successful = (int) ($row->successful ?? 0);

        return [
            'total' => $total,
            'successful' => $successful,
            'failed' => $total - $successful,
            'uptime_percent' => $total > 0 ? round($successful / $total * 100, 2) : null,
            'avg_response_ms' => $row->avg_response !== null ? (int) round((float) $row->avg_response) : null,
        ];
    }

    /**
     * Time-bucketed check activity with every bucket present (empty buckets have zero checks).
     *
     * @param  Builder<CheckResult>  $query
     * @return list<array{timestamp: string, checks: int, successful: int, failed: int, avg_response_ms: int|null}>
     */
    private function series(Builder $query, Carbon $from, int $bucket): array
    {
        $bucketExpr = $this->bucketExpression($query->getConnection()->getDriverName());

        $rows = $query->where('checked_at', '>=', $from)
            ->selectRaw("{$bucketExpr} AS bucket", [$bucket])
            ->selectRaw('COUNT(*) AS total')
            ->selectRaw('SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) AS successful')
            ->selectRaw('AVG(CASE WHEN status_code IS NOT NULL THEN response_time_ms END) AS avg_response')
            ->groupBy('bucket')
            ->toBase()
            ->get()
            ->keyBy(fn ($row) => (int) $row->bucket);

        $series = [];
        $first = intdiv($from->getTimestamp(), $bucket);
        $last = intdiv(now()->getTimestamp(), $bucket);

        for ($index = $first; $index <= $last; $index++) {
            $row = $rows->get($index);
            $total = (int) ($row->total ?? 0);
            $successful = (int) ($row->successful ?? 0);

            $series[] = [
                'timestamp' => Carbon::createFromTimestampUTC($index * $bucket)->toIso8601String(),
                'checks' => $total,
                'successful' => $successful,
                'failed' => $total - $successful,
                'avg_response_ms' => isset($row->avg_response) ? (int) round((float) $row->avg_response) : null,
            ];
        }

        return $series;
    }

    /**
     * SQL returning the bucket index (unix time / bucket size) of `checked_at`, stored in UTC.
     */
    private function bucketExpression(string $driver): string
    {
        return match ($driver) {
            'sqlite' => "(CAST(strftime('%s', checked_at) AS INTEGER) / ?)",
            'pgsql' => 'FLOOR(EXTRACT(EPOCH FROM checked_at) / ?)',
            default => 'FLOOR(UNIX_TIMESTAMP(checked_at) / ?)',
        };
    }

    /**
     * @return array{0: Carbon, 1: int}
     */
    private function window(string $range): array
    {
        [$duration, $bucket] = self::RANGES[$range] ?? self::RANGES['24h'];

        // Align the window start to a bucket boundary so buckets are stable between polls.
        $from = Carbon::createFromTimestampUTC(intdiv(now()->getTimestamp() - $duration, $bucket) * $bucket + $bucket);

        return [$from, $bucket];
    }
}
