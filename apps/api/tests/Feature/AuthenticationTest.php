<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private const SPA = ['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/login'];

    public function test_user_can_log_in_with_valid_credentials(): void
    {
        $user = User::factory()->create(['password' => 'correct-horse-battery']);

        $this->withHeaders(self::SPA)
            ->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'correct-horse-battery'])
            ->assertOk()
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonMissingPath('user.password');

        $this->assertAuthenticatedAs($user, 'web');
        $this->withHeaders(self::SPA)->getJson('/api/auth/user')->assertOk()->assertJsonPath('user.id', $user->id);
    }

    public function test_login_fails_with_wrong_password_and_generic_message(): void
    {
        $user = User::factory()->create(['password' => 'correct-horse-battery']);

        $this->withHeaders(self::SPA)
            ->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'wrong'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'These credentials do not match our records.']);

        $this->assertGuest('web');
    }

    public function test_login_requires_email_and_password(): void
    {
        $this->postJson('/api/auth/login', [])->assertUnprocessable()->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_login_is_rate_limited(): void
    {
        $user = User::factory()->create();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'nope'])->assertUnprocessable();
        }

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'nope'])->assertTooManyRequests();
    }

    public function test_protected_routes_require_authentication(): void
    {
        foreach (['/api/auth/user', '/api/endpoints', '/api/dashboard', '/api/checks', '/api/incidents', '/api/settings/monitoring'] as $uri) {
            $this->getJson($uri)->assertUnauthorized();
        }

        $this->postJson('/api/endpoints', [])->assertUnauthorized();
        $this->deleteJson('/api/settings/demo-data')->assertUnauthorized();
    }

    public function test_user_can_log_out(): void
    {
        $user = User::factory()->create(['password' => 'correct-horse-battery']);

        $this->withHeaders(self::SPA)->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'correct-horse-battery'])->assertOk();
        $this->withHeaders(self::SPA)->postJson('/api/auth/logout')->assertNoContent();

        $this->assertGuest('web');
    }
}
