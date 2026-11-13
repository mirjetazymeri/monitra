<?php

namespace Tests\Feature;

use App\Models\CheckResult;
use App\Models\Endpoint;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EndpointManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Billing API',
            'url' => 'https://billing.example.com/health',
            'expected_status' => 200,
            'check_interval' => 300,
        ], $overrides);
    }

    public function test_user_can_create_an_endpoint(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/endpoints', $this->payload())
            ->assertCreated()
            ->assertJsonPath('name', 'Billing API')
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('is_demo', false);

        $endpoint = Endpoint::sole();
        $this->assertSame($this->user->id, $endpoint->user_id);
        $this->assertNotNull($endpoint->next_check_at, 'A new endpoint is scheduled for an immediate first check.');
    }

    public function test_creation_is_validated(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/endpoints', ['name' => '', 'url' => 'not-a-url', 'expected_status' => 99, 'check_interval' => 7])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'url', 'expected_status', 'check_interval']);
    }

    public function test_user_only_sees_their_own_endpoints(): void
    {
        Endpoint::factory()->for($this->user)->create(['name' => 'Mine']);
        Endpoint::factory()->create(['name' => 'Someone else']);

        $this->actingAs($this->user)
            ->getJson('/api/endpoints')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Mine');
    }

    public function test_index_includes_latest_check_and_observed_uptime(): void
    {
        $endpoint = Endpoint::factory()->for($this->user)->create();
        CheckResult::factory()->for($endpoint)->count(3)->create(['checked_at' => now()->subHour()]);
        CheckResult::factory()->for($endpoint)->failed()->create(['checked_at' => now()->subMinutes(5)]);
        // Older than 24h: excluded from the 24h figures.
        CheckResult::factory()->for($endpoint)->failed()->create(['checked_at' => now()->subDays(2)]);

        $this->actingAs($this->user)
            ->getJson('/api/endpoints')
            ->assertOk()
            ->assertJsonPath('0.stats_24h.checks', 4)
            ->assertJsonPath('0.stats_24h.successful', 3)
            ->assertJsonPath('0.stats_24h.uptime_percent', 75)
            ->assertJsonPath('0.latest_check.status_code', 500);
    }

    public function test_user_can_update_and_toggle_an_endpoint(): void
    {
        $endpoint = Endpoint::factory()->for($this->user)->create();

        $this->actingAs($this->user)
            ->putJson("/api/endpoints/{$endpoint->id}", $this->payload(['name' => 'Renamed', 'check_interval' => 60]))
            ->assertOk()
            ->assertJsonPath('name', 'Renamed')
            ->assertJsonPath('check_interval', 60);

        $this->actingAs($this->user)
            ->patchJson("/api/endpoints/{$endpoint->id}", ['is_enabled' => false])
            ->assertOk()
            ->assertJsonPath('is_enabled', false)
            ->assertJsonPath('status', 'paused');
    }

    public function test_deleting_an_endpoint_removes_its_history(): void
    {
        $endpoint = Endpoint::factory()->for($this->user)->create();
        CheckResult::factory()->for($endpoint)->count(3)->create();

        $this->actingAs($this->user)->deleteJson("/api/endpoints/{$endpoint->id}")->assertNoContent();

        $this->assertModelMissing($endpoint);
        $this->assertSame(0, CheckResult::count());
    }

    public function test_users_cannot_access_endpoints_they_do_not_own(): void
    {
        $foreign = Endpoint::factory()->create();

        $this->actingAs($this->user)->getJson("/api/endpoints/{$foreign->id}")->assertNotFound();
        $this->actingAs($this->user)->getJson("/api/endpoints/{$foreign->id}/metrics")->assertNotFound();
        $this->actingAs($this->user)->putJson("/api/endpoints/{$foreign->id}", $this->payload())->assertNotFound();
        $this->actingAs($this->user)->patchJson("/api/endpoints/{$foreign->id}", ['is_enabled' => false])->assertNotFound();
        $this->actingAs($this->user)->deleteJson("/api/endpoints/{$foreign->id}")->assertNotFound();
        $this->actingAs($this->user)->postJson("/api/endpoints/{$foreign->id}/check")->assertNotFound();

        $this->assertModelExists($foreign);
        $this->assertTrue($foreign->fresh()->is_enabled);
    }

    public function test_history_and_incidents_cannot_be_filtered_by_foreign_endpoints(): void
    {
        $foreign = Endpoint::factory()->create();
        CheckResult::factory()->for($foreign)->create();

        $this->actingAs($this->user)->getJson("/api/checks?endpoint_id={$foreign->id}")->assertUnprocessable();
        $this->actingAs($this->user)->getJson("/api/incidents?endpoint_id={$foreign->id}")->assertUnprocessable();
        $this->actingAs($this->user)->getJson('/api/checks')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_history_is_paginated_and_filterable(): void
    {
        $endpoint = Endpoint::factory()->for($this->user)->create();
        CheckResult::factory()->for($endpoint)->count(30)->create();
        CheckResult::factory()->for($endpoint)->failed()->count(5)->create();

        $this->actingAs($this->user)
            ->getJson('/api/checks?per_page=10')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.total', 35)
            ->assertJsonPath('meta.last_page', 4);

        $this->actingAs($this->user)
            ->getJson("/api/checks?status=failure&endpoint_id={$endpoint->id}")
            ->assertOk()
            ->assertJsonPath('meta.total', 5);
    }

    public function test_demo_data_can_be_removed_without_touching_live_endpoints(): void
    {
        Endpoint::factory()->for($this->user)->demo()->count(2)->create();
        $live = Endpoint::factory()->for($this->user)->create();

        $this->actingAs($this->user)->deleteJson('/api/settings/demo-data')->assertOk()->assertJsonPath('deleted_endpoints', 2);

        $this->assertSame([$live->id], Endpoint::pluck('id')->all());
    }
}
