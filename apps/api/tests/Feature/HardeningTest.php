<?php

namespace Tests\Feature;

use App\Enums\CheckErrorCategory;
use App\Models\Endpoint;
use App\Services\Monitoring\HttpChecker;
use App\Services\Monitoring\SystemDnsResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HardeningTest extends TestCase
{
    use RefreshDatabase;

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
