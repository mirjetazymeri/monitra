<?php

namespace Tests\Feature;

use App\Models\CheckResult;
use App\Models\Endpoint;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MaintenanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_prune_command_deletes_only_results_older_than_retention(): void
    {
        $endpoint = Endpoint::factory()->create();
        CheckResult::factory()->for($endpoint)->count(3)->create(['checked_at' => now()->subDays(100)]);
        $recent = CheckResult::factory()->for($endpoint)->count(2)->create(['checked_at' => now()->subDays(5)]);

        config(['monitra.retention_days' => 90]);
        $this->artisan('monitra:prune-checks')->expectsOutputToContain('Deleted 3')->assertSuccessful();

        $this->assertEqualsCanonicalizing($recent->pluck('id')->all(), CheckResult::pluck('id')->all());
    }

    public function test_prune_command_rejects_invalid_retention(): void
    {
        $this->artisan('monitra:prune-checks', ['--days' => 0])->assertFailed();
    }

    public function test_endpoint_quota_is_enforced_on_creation_excluding_demo_endpoints(): void
    {
        config(['monitra.max_endpoints_per_user' => 2]);
        $user = User::factory()->create();
        Endpoint::factory()->for($user)->count(2)->create();
        Endpoint::factory()->for($user)->demo()->create();

        $payload = ['name' => 'Third API', 'url' => 'https://third.example.com/', 'expected_status' => 200, 'check_interval' => 300];

        $this->actingAs($user)->postJson('/api/endpoints', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => 'limit of 2']);

        // Updates are unaffected by the quota.
        $existing = $user->endpoints()->where('is_demo', false)->first();
        $this->actingAs($user)->patchJson("/api/endpoints/{$existing->id}", ['is_enabled' => false])->assertOk();
    }

    public function test_demo_seeder_is_non_destructive_when_re_run(): void
    {
        config(['monitra.demo.email' => 'demo@monitra.test', 'monitra.demo.password' => 'local-demo-pass']);

        $this->seed(DemoSeeder::class);
        $user = User::where('email', 'demo@monitra.test')->sole();
        $this->assertTrue(Hash::check('local-demo-pass', $user->password));

        // A user-added endpoint with real history must survive a re-seed.
        $mine = Endpoint::factory()->for($user)->create(['url' => 'https://mine.example.com/']);
        CheckResult::factory()->for($mine)->count(3)->create();
        $liveCount = $user->endpoints()->where('is_demo', false)->count();
        $demoIds = $user->endpoints()->where('is_demo', true)->pluck('id');

        $this->seed(DemoSeeder::class);

        $this->assertModelExists($mine);
        $this->assertSame(3, $mine->checks()->count());
        $this->assertSame($liveCount, $user->endpoints()->where('is_demo', false)->count(), 'Sample live endpoints are not duplicated.');
        $this->assertSame(6, $user->endpoints()->where('is_demo', true)->count());
        $this->assertEmpty(array_intersect($demoIds->all(), $user->endpoints()->where('is_demo', true)->pluck('id')->all()), 'Demo endpoints are regenerated.');
        $this->assertSame(1, User::count());
    }
}
