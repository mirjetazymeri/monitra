<?php

namespace Tests\Feature;

use App\Enums\CheckErrorCategory;
use App\Models\Endpoint;
use App\Models\User;
use App\Services\Monitoring\HttpChecker;
use App\Services\Monitoring\SystemDnsResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_responses_carry_security_headers(): void
    {
        $user = User::factory()->create();

        foreach ([$this->getJson('/api/auth/user'), $this->actingAs($user)->getJson('/api/endpoints'), $this->getJson('/')] as $response) {
            $response->assertHeader('X-Content-Type-Options', 'nosniff')
                ->assertHeader('X-Frame-Options', 'DENY')
                ->assertHeader('Referrer-Policy', 'no-referrer')
                ->assertHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
                ->assertHeaderMissing('Strict-Transport-Security'); // plain HTTP in tests
        }
    }

    public function test_hsts_is_only_sent_over_https(): void
    {
        $this->get('https://localhost/up')->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    public function test_cors_preflight_and_credentials_still_work_with_security_headers(): void
    {
        $this->call('OPTIONS', '/api/endpoints', server: [
            'HTTP_ORIGIN' => 'http://localhost:3000',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'x-xsrf-token,content-type',
        ])
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
            ->assertHeader('Access-Control-Allow-Credentials', 'true')
            ->assertHeader('Access-Control-Max-Age', '7200')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_dns_lookups_run_with_bounded_resolver_options(): void
    {
        config(['monitra.dns_timeout' => 3, 'monitra.dns_attempts' => 1]);
        $resolver = new SystemDnsResolver;
        putenv('RES_OPTIONS');

        $seen = $resolver->withResolverLimits(fn () => getenv('RES_OPTIONS'));

        $this->assertSame('timeout:3 attempts:1', $seen);
        $this->assertFalse(getenv('RES_OPTIONS'), 'RES_OPTIONS is restored after the lookup.');
    }

    public function test_resolver_limits_are_clamped_and_respect_operator_configuration(): void
    {
        config(['monitra.dns_timeout' => 0, 'monitra.dns_attempts' => 99]);
        $this->assertSame('timeout:1 attempts:5', (new SystemDnsResolver)->resolverOptions());

        putenv('RES_OPTIONS=timeout:9');
        try {
            $this->assertSame('timeout:9', (new SystemDnsResolver)->withResolverLimits(fn () => getenv('RES_OPTIONS')));
        } finally {
            putenv('RES_OPTIONS');
        }
    }

    public function test_dns_failure_records_lookup_time_without_sending_a_request(): void
    {
        Http::fake();
        $this->dns->records['gone.example.com'] = [];
        $endpoint = Endpoint::factory()->create(['url' => 'https://gone.example.com/']);

        $outcome = app(HttpChecker::class)->check($endpoint);

        $this->assertSame(CheckErrorCategory::DnsFailure, $outcome->errorCategory);
        $this->assertIsInt($outcome->responseTimeMs);
        Http::assertNothingSent();
    }
}
