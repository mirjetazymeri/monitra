<?php

namespace Tests\Feature;

use App\Enums\CheckErrorCategory;
use App\Enums\EndpointStatus;
use App\Models\CheckResult;
use App\Models\Endpoint;
use App\Models\Incident;
use App\Models\User;
use App\Services\Monitoring\CheckOutcome;
use App\Services\Monitoring\MonitoringService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MonitoringTest extends TestCase
{
    use RefreshDatabase;

    private function monitoring(): MonitoringService
    {
        return app(MonitoringService::class);
    }

    public function test_successful_check_is_persisted(): void
    {
        Http::fake(['https://ok.example.com/*' => Http::response('ok', 200)]);
        $endpoint = Endpoint::factory()->create(['url' => 'https://ok.example.com/health', 'check_interval' => 60]);

        $result = $this->monitoring()->check($endpoint);

        $this->assertTrue($result->is_success);
        $this->assertSame(200, $result->status_code);
        $this->assertNotNull($result->response_time_ms);
        $this->assertFalse($result->is_simulated);
        $this->assertSame(EndpointStatus::Up, $endpoint->fresh()->current_status);
        $this->assertSame(0, $endpoint->fresh()->next_check_at->second, 'Next check is aligned to a minute boundary.');

        Http::assertSent(fn (Request $r) => $r->method() === 'GET' && $r->hasHeader('User-Agent', config('monitraz.user_agent')));
    }

    public function test_next_check_is_anchored_to_the_minute_so_intervals_do_not_drift(): void
    {
        $endpoint = Endpoint::factory()->create(['check_interval' => 300]);

        // A check that finishes 2 seconds after the scheduler's 10:00:00 tick...
        $this->monitoring()->record($endpoint, new CheckOutcome(true, 200, 90, null), Carbon::parse('2026-01-01 10:00:02'));

        // ...is due again exactly at the 10:05:00 tick, not 10:05:02 (which would slip to 10:06:00).
        $this->assertSame('2026-01-01 10:05:00', $endpoint->fresh()->next_check_at->format('Y-m-d H:i:s'));

        $this->travelTo(Carbon::parse('2026-01-01 10:05:00'));
        $this->assertTrue(Endpoint::query()->due()->whereKey($endpoint->id)->exists());
    }

    public function test_unexpected_status_is_a_failure(): void
    {
        Http::fake(['*' => Http::response('nope', 500)]);
        $endpoint = Endpoint::factory()->create();

        $result = $this->monitoring()->check($endpoint);

        $this->assertFalse($result->is_success);
        $this->assertSame(500, $result->status_code);
        $this->assertSame(CheckErrorCategory::StatusMismatch, $result->error_category);
    }

    public function test_custom_expected_status_is_respected(): void
    {
        Http::fake(['*' => Http::response('', 204)]);
        $endpoint = Endpoint::factory()->create(['expected_status' => 204]);

        $this->assertTrue($this->monitoring()->check($endpoint)->is_success);
    }

    public function test_redirect_is_not_followed_and_counts_against_expected_status(): void
    {
        Http::fake(['*' => Http::response('', 302, ['Location' => 'http://169.254.169.254/'])]);
        $endpoint = Endpoint::factory()->create();

        $result = $this->monitoring()->check($endpoint);

        $this->assertFalse($result->is_success);
        $this->assertSame(302, $result->status_code);
        Http::assertSentCount(1);
    }

    public function test_timeouts_are_categorised_without_leaking_messages(): void
    {
        Http::fake(fn () => throw new ConnectionException('cURL error 28: Operation timed out after 10001 ms for 10.0.0.1'));
        $endpoint = Endpoint::factory()->create();

        $result = $this->monitoring()->check($endpoint);

        $this->assertFalse($result->is_success);
        $this->assertNull($result->status_code);
        $this->assertSame(CheckErrorCategory::Timeout, $result->error_category);
        $this->assertStringNotContainsString('10.0.0.1', json_encode($result->toArray()));
    }

    public function test_connection_failures_are_categorised(): void
    {
        Http::fake(fn () => throw new ConnectionException('cURL error 7: Failed to connect'));
        $this->assertSame(CheckErrorCategory::ConnectionFailed, $this->monitoring()->check(Endpoint::factory()->create())->error_category);
    }

    public function test_failure_opens_an_incident_and_recovery_resolves_it(): void
    {
        $endpoint = Endpoint::factory()->create();
        $monitoring = $this->monitoring();

        $monitoring->record($endpoint, new CheckOutcome(true, 200, 100, null), now()->subMinutes(30));
        $this->assertSame(0, Incident::count());

        $monitoring->record($endpoint, CheckOutcome::failure(CheckErrorCategory::StatusMismatch, 90, 503), now()->subMinutes(20));
        $incident = Incident::sole();
        $this->assertSame('open', $incident->state->value);
        $this->assertSame(503, $incident->status_code);
        $this->assertSame(EndpointStatus::Down, $endpoint->fresh()->current_status);

        // Continued failure extends the same incident rather than opening a duplicate.
        $monitoring->record($endpoint, CheckOutcome::failure(CheckErrorCategory::Timeout, 10000), now()->subMinutes(10));
        $this->assertSame(1, Incident::count());
        $this->assertSame(2, $incident->fresh()->failed_checks);

        $monitoring->record($endpoint, new CheckOutcome(true, 200, 120, null), now());
        $incident->refresh();
        $this->assertSame('resolved', $incident->state->value);
        $this->assertNotNull($incident->resolved_at);
        $this->assertSame(EndpointStatus::Up, $endpoint->fresh()->current_status);

        // A new outage opens a new incident.
        $monitoring->record($endpoint, CheckOutcome::failure(CheckErrorCategory::ConnectionFailed), now()->addMinute());
        $this->assertSame(2, Incident::count());
        $this->assertSame(1, Incident::where('state', 'open')->count());
        $this->assertSame(5, CheckResult::count());
    }

    public function test_database_rejects_a_second_open_incident_for_the_same_endpoint(): void
    {
        $endpoint = Endpoint::factory()->create();
        $endpoint->incidents()->create(['state' => 'open', 'started_at' => now()]);

        $this->expectException(QueryException::class);
        $endpoint->incidents()->create(['state' => 'open', 'started_at' => now()]);
    }

    public function test_manual_check_endpoint_runs_a_check(): void
    {
        Http::fake(['*' => Http::response('ok', 200)]);
        $user = User::factory()->create();
        $endpoint = Endpoint::factory()->for($user)->disabled()->create();

        $this->actingAs($user)
            ->postJson("/api/endpoints/{$endpoint->id}/check")
            ->assertCreated()
            ->assertJsonPath('is_success', true)
            ->assertJsonPath('status_code', 200);

        $this->assertSame(1, $endpoint->checks()->count());
    }

    public function test_demo_endpoints_cannot_be_checked_live(): void
    {
        Http::fake();
        $user = User::factory()->create();
        $endpoint = Endpoint::factory()->for($user)->demo()->create();

        $this->actingAs($user)->postJson("/api/endpoints/{$endpoint->id}/check")->assertForbidden();

        Http::assertNothingSent();
    }

    public function test_scheduler_checks_only_due_enabled_live_endpoints(): void
    {
        Http::fake(['*' => Http::response('ok', 200)]);

        $due = Endpoint::factory()->create(['url' => 'https://due.example.com/']);
        $due->forceFill(['next_check_at' => now()->subMinute()])->save();
        $never = Endpoint::factory()->create(['url' => 'https://never.example.com/']);
        $notDue = Endpoint::factory()->create(['url' => 'https://later.example.com/']);
        $notDue->forceFill(['next_check_at' => now()->addMinutes(5)])->save();
        Endpoint::factory()->disabled()->create(['url' => 'https://disabled.example.com/']);
        Endpoint::factory()->demo()->create(['url' => 'https://demo.example.com/']);

        $this->artisan('monitraz:check-due')->assertSuccessful();

        Http::assertSentCount(2);
        $this->assertSame(1, $due->checks()->count());
        $this->assertSame(1, $never->checks()->count());
        $this->assertSame(0, $notDue->checks()->count());
        $this->assertSame(2, CheckResult::count());

        // Second run: nothing is due any more.
        $this->artisan('monitraz:check-due')->expectsOutput('No endpoints are due.')->assertSuccessful();
    }

    public function test_scheduler_respects_batch_limit(): void
    {
        Http::fake(['*' => Http::response('ok', 200)]);
        Endpoint::factory()->count(3)->create();

        $this->artisan('monitraz:check-due', ['--limit' => 2])->assertSuccessful();

        $this->assertSame(2, CheckResult::count());
    }
}
