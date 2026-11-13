<?php

namespace Tests\Feature;

use App\Models\Endpoint;
use App\Models\User;
use App\Services\Monitoring\BlockedDestinationException;
use App\Services\Monitoring\DestinationGuard;
use App\Services\Monitoring\HttpChecker;
use App\Services\Monitoring\ResolvedDestination;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SsrfProtectionTest extends TestCase
{
    use RefreshDatabase;

    public static function blockedUrls(): array
    {
        return [
            'localhost' => ['http://localhost/'],
            'localhost subdomain' => ['http://api.localhost/'],
            'loopback v4' => ['http://127.0.0.1/'],
            'loopback v4 range' => ['http://127.10.20.30/'],
            'loopback v6' => ['http://[::1]/'],
            'unspecified' => ['http://0.0.0.0/'],
            'private 10/8' => ['http://10.0.0.5/'],
            'private 172.16/12' => ['http://172.20.1.1/'],
            'private 192.168/16' => ['https://192.168.1.1/'],
            'carrier grade nat' => ['http://100.64.0.1/'],
            'link-local / AWS metadata' => ['http://169.254.169.254/latest/meta-data/'],
            'alibaba metadata' => ['http://100.100.100.200/'],
            'multicast' => ['http://224.0.0.1/'],
            'broadcast' => ['http://255.255.255.255/'],
            'ipv6 unique local / AWS metadata v6' => ['http://[fd00:ec2::254]/'],
            'ipv6 link-local' => ['http://[fe80::1]/'],
            'ipv4-mapped ipv6 loopback' => ['http://[::ffff:127.0.0.1]/'],
            'nat64 embedded private' => ['http://[64:ff9b::a00:1]/'],
            '6to4 embedded' => ['http://[2002:7f00:1::]/'],
            'decimal ip encoding' => ['http://2130706433/'],
            'hex ip encoding' => ['http://0x7f000001/'],
            'short ip encoding' => ['http://127.1/'],
            'single label host' => ['http://intranet/'],
            'internal tld' => ['http://metadata.google.internal/'],
            'local mdns' => ['http://printer.local/'],
            'file scheme' => ['file:///etc/passwd'],
            'gopher scheme' => ['gopher://example.com/'],
            'ftp scheme' => ['ftp://example.com/'],
            'embedded credentials' => ['https://user:secret@example.com/'],
            'embedded user only' => ['https://admin@example.com/'],
            'disallowed port' => ['http://example.com:22/'],
            'redis port' => ['http://example.com:6379/'],
            'whitespace' => ["http://example.com/\nHost: evil"],
        ];
    }

    #[DataProvider('blockedUrls')]
    public function test_guard_rejects_non_public_destinations(string $url): void
    {
        $this->expectException(BlockedDestinationException::class);

        app(DestinationGuard::class)->resolve($url);
    }

    public function test_guard_accepts_public_destinations(): void
    {
        $guard = app(DestinationGuard::class);

        $this->assertSame('93.184.215.14', $guard->resolve('https://example.com/health?x=1')->ip);
        $this->assertSame('1.1.1.1', $guard->resolve('https://1.1.1.1/')->ip);
        $this->assertSame('2606:4700:4700::1111', $guard->resolve('https://[2606:4700:4700::1111]/')->ip);
        $this->assertSame(8443, $guard->resolve('https://example.com:8443/')->port);
    }

    public function test_hostname_resolving_to_a_private_address_is_blocked(): void
    {
        // A public-looking name pointing at an internal service (DNS rebinding / split horizon).
        $this->dns->records['rebind.attacker.com'] = ['127.0.0.1'];

        $this->expectException(BlockedDestinationException::class);
        app(DestinationGuard::class)->resolve('https://rebind.attacker.com/');
    }

    public function test_hostname_with_any_private_answer_is_blocked(): void
    {
        $this->dns->records['mixed.attacker.com'] = ['93.184.215.14', '10.0.0.7'];

        $this->expectException(BlockedDestinationException::class);
        app(DestinationGuard::class)->resolve('https://mixed.attacker.com/');
    }

    public function test_unresolvable_hostname_is_reported_as_dns_failure(): void
    {
        $this->dns->records['nx.example.com'] = [];

        try {
            app(DestinationGuard::class)->resolve('https://nx.example.com/');
            $this->fail('Expected exception');
        } catch (BlockedDestinationException $e) {
            $this->assertTrue($e->dnsFailure);
        }
    }

    public function test_transport_pins_the_connection_to_the_validated_ip_and_disables_redirects(): void
    {
        $tooLarge = false;
        $options = app(HttpChecker::class)->transportOptions(
            new ResolvedDestination('https://example.com/', 'https', 'example.com', 443, '93.184.215.14', false),
            $tooLarge,
        );

        $this->assertSame(['example.com:443:93.184.215.14'], $options['curl'][CURLOPT_RESOLVE]);
        $this->assertFalse($options['allow_redirects']);
        $this->assertSame(['http', 'https'], $options['protocols']);
        $this->assertSame(['http' => null, 'https' => null], $options['proxy'], 'Environment proxies must be ignored.');

        // The progress callback aborts transfers above the configured size limit.
        $limit = config('monitraz.max_response_bytes');
        $this->assertFalse($options['progress']($limit, 100));
        $this->assertTrue($options['progress']($limit + 1, 0));
        $this->assertTrue($tooLarge);
    }

    public function test_ipv6_pin_uses_bracket_notation(): void
    {
        $tooLarge = false;
        $options = app(HttpChecker::class)->transportOptions(
            new ResolvedDestination('https://v6.example.com/', 'https', 'v6.example.com', 443, '2606:4700::6810:84e5', false),
            $tooLarge,
        );

        $this->assertSame(['v6.example.com:443:[2606:4700::6810:84e5]'], $options['curl'][CURLOPT_RESOLVE]);
    }

    public function test_api_rejects_private_urls_on_create_and_update(): void
    {
        $user = User::factory()->create();
        $this->dns->records['internal.attacker.com'] = ['192.168.0.10'];

        foreach (['http://127.0.0.1/', 'http://169.254.169.254/', 'https://internal.attacker.com/'] as $url) {
            $this->actingAs($user)
                ->postJson('/api/endpoints', ['name' => 'x x', 'url' => $url, 'expected_status' => 200, 'check_interval' => 300])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('url');
        }

        $endpoint = Endpoint::factory()->for($user)->create();
        $this->actingAs($user)
            ->patchJson("/api/endpoints/{$endpoint->id}", ['url' => 'http://10.1.2.3/'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('url');
    }

    public function test_check_time_dns_change_is_blocked_without_sending_a_request(): void
    {
        Http::fake();
        $user = User::factory()->create();
        $endpoint = Endpoint::factory()->for($user)->create(['url' => 'https://flip.attacker.com/']);

        // Valid when created, rebinds to loopback before the check runs.
        $this->dns->records['flip.attacker.com'] = ['127.0.0.1'];

        $this->actingAs($user)
            ->postJson("/api/endpoints/{$endpoint->id}/check")
            ->assertCreated()
            ->assertJsonPath('is_success', false)
            ->assertJsonPath('error_category', 'blocked_destination');

        Http::assertNothingSent();
    }
}
