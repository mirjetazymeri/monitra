<?php

namespace Tests\Feature;

use App\Models\CheckResult;
use App\Models\Endpoint;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_aggregates_only_the_users_recorded_checks(): void
    {
        $user = User::factory()->create();

        $up = Endpoint::factory()->for($user)->create();
        $up->forceFill(['current_status' => 'up'])->save();
        $down = Endpoint::factory()->for($user)->create();
        $down->forceFill(['current_status' => 'down'])->save();
        Endpoint::factory()->for($user)->create(); // pending
        Endpoint::factory()->for($user)->disabled()->create(); // paused

        CheckResult::factory()->for($up)->count(3)->create(['response_time_ms' => 100, 'checked_at' => now()->subHours(2)]);
        CheckResult::factory()->for($down)->failed()->create(['response_time_ms' => 400, 'checked_at' => now()->subHour()]);
        // Outside the 24h window.
        CheckResult::factory()->for($up)->failed()->create(['checked_at' => now()->subDays(3)]);
        // Another user's data must never leak into the figures.
        CheckResult::factory()->count(10)->failed()->create(['checked_at' => now()->subHour()]);

        $down->incidents()->create(['state' => 'open', 'started_at' => now()->subHour()]);

        $response = $this->actingAs($user)->getJson('/api/dashboard?range=24h')->assertOk();

        $response->assertJsonPath('endpoints.total', 4)
            ->assertJsonPath('endpoints.up', 1)
            ->assertJsonPath('endpoints.down', 1)
            ->assertJsonPath('endpoints.pending', 1)
            ->assertJsonPath('endpoints.paused', 1)
            ->assertJsonPath('checks.total', 4)
            ->assertJsonPath('checks.successful', 3)
            ->assertJsonPath('checks.failed', 1)
            ->assertJsonPath('checks.uptime_percent', 75)
            ->assertJsonPath('checks.avg_response_ms', 175)
            ->assertJsonPath('open_incidents', 1)
            ->assertJsonPath('includes_demo_data', false)
            ->assertJsonCount(1, 'recent_incidents');

        $series = $response->json('series');
        $this->assertCount(24, $series);
        $this->assertSame(4, array_sum(array_column($series, 'checks')));
        $this->assertSame(1, array_sum(array_column($series, 'failed')));
    }

    public function test_uptime_is_null_without_recorded_checks(): void
    {
        $user = User::factory()->create();
        Endpoint::factory()->for($user)->create();

        $this->actingAs($user)
            ->getJson('/api/dashboard?range=7d')
            ->assertOk()
            ->assertJsonPath('checks.total', 0)
            ->assertJsonPath('checks.uptime_percent', null)
            ->assertJsonPath('checks.avg_response_ms', null);
    }

    public function test_range_is_validated(): void
    {
        $this->actingAs(User::factory()->create())->getJson('/api/dashboard?range=1y')->assertUnprocessable();
        $this->actingAs(User::factory()->create())->getJson('/api/dashboard?source=fake')->assertUnprocessable();
    }

    public function test_simulated_demo_data_is_excluded_from_live_figures_by_default(): void
    {
        $user = User::factory()->create();

        $live = Endpoint::factory()->for($user)->create();
        $live->forceFill(['current_status' => 'up'])->save();
        CheckResult::factory()->for($live)->count(2)->create(['response_time_ms' => 100, 'checked_at' => now()->subHour()]);

        $demo = Endpoint::factory()->for($user)->demo()->create();
        $demo->forceFill(['current_status' => 'down'])->save();
        CheckResult::factory()->for($demo)->failed()->count(8)->create(['is_simulated' => true, 'response_time_ms' => 900, 'checked_at' => now()->subHour()]);
        $demo->incidents()->create(['state' => 'open', 'started_at' => now()->subHour(), 'is_simulated' => true]);

        $this->actingAs($user)
            ->getJson('/api/dashboard?range=24h')
            ->assertOk()
            ->assertJsonPath('source', 'live')
            ->assertJsonPath('includes_demo_data', true)
            ->assertJsonPath('endpoints.total', 1)
            ->assertJsonPath('endpoints.down', 0)
            ->assertJsonPath('checks.total', 2)
            ->assertJsonPath('checks.uptime_percent', 100)
            ->assertJsonPath('checks.avg_response_ms', 100)
            ->assertJsonPath('open_incidents', 0)
            ->assertJsonCount(0, 'recent_incidents');

        $this->actingAs($user)
            ->getJson('/api/dashboard?range=24h&source=all')
            ->assertOk()
            ->assertJsonPath('source', 'all')
            ->assertJsonPath('endpoints.total', 2)
            ->assertJsonPath('checks.total', 10)
            ->assertJsonPath('checks.uptime_percent', 20)
            ->assertJsonPath('open_incidents', 1)
            ->assertJsonCount(1, 'recent_incidents');

        $this->actingAs($user)->getJson('/api/checks?source=live')->assertOk()->assertJsonPath('meta.total', 2);
        $this->actingAs($user)->getJson('/api/checks')->assertOk()->assertJsonPath('meta.total', 10);
    }

    public function test_endpoint_metrics_series(): void
    {
        $user = User::factory()->create();
        $endpoint = Endpoint::factory()->for($user)->create();
        CheckResult::factory()->for($endpoint)->count(2)->create(['response_time_ms' => 200, 'checked_at' => now()->subHours(3)]);

        $this->actingAs($user)
            ->getJson("/api/endpoints/{$endpoint->id}/metrics?range=7d")
            ->assertOk()
            ->assertJsonPath('checks.total', 2)
            ->assertJsonPath('checks.avg_response_ms', 200)
            ->assertJsonCount(28, 'series');
    }
}
