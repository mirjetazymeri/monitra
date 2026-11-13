<?php

namespace App\Services\Monitoring;

/**
 * Server-side request forgery (SSRF) protection for user-supplied URLs.
 *
 * Defence in depth:
 *  1. Syntactic URL policy (scheme, credentials, port, hostname shape, internal suffixes).
 *  2. Every DNS answer must be a publicly routable unicast address.
 *  3. The HTTP client is pinned to the validated IP (CURLOPT_RESOLVE), so the
 *     connection cannot be re-resolved to a different address (DNS rebinding).
 *  4. Redirects are disabled and the connected IP is verified after the request.
 */
class DestinationGuard
{
    /** Hostname suffixes that only exist on private networks. */
    private const BLOCKED_HOST_SUFFIXES = [
        'localhost', 'local', 'localdomain', 'internal', 'intranet', 'lan', 'home', 'corp', 'home.arpa',
    ];

    /** Non-public IPv4 ranges (RFC 6890 special-purpose registry and friends). */
    private const BLOCKED_IPV4 = [
        '0.0.0.0/8',          // "this" network
        '10.0.0.0/8',         // private
        '100.64.0.0/10',      // carrier-grade NAT (also Alibaba metadata 100.100.100.200)
        '127.0.0.0/8',        // loopback
        '169.254.0.0/16',     // link-local (cloud metadata 169.254.169.254)
        '172.16.0.0/12',      // private
        '192.0.0.0/24',       // IETF protocol assignments
        '192.0.2.0/24',       // TEST-NET-1
        '192.88.99.0/24',     // 6to4 relay anycast
        '192.168.0.0/16',     // private
        '198.18.0.0/15',      // benchmarking
        '198.51.100.0/24',    // TEST-NET-2
        '203.0.113.0/24',     // TEST-NET-3
        '224.0.0.0/4',        // multicast
        '240.0.0.0/4',        // reserved + broadcast
    ];

    /** Non-public ranges inside the IPv6 global unicast block 2000::/3. */
    private const BLOCKED_IPV6 = [
        '2001::/32',          // Teredo (tunnels to arbitrary IPv4)
        '2001:2::/48',        // benchmarking
        '2001:10::/28',       // ORCHID
        '2001:20::/28',       // ORCHIDv2
        '2001:db8::/32',      // documentation
        '2002::/16',          // 6to4 (embeds arbitrary IPv4)
        '3fff::/20',          // documentation
    ];

    public function __construct(private readonly DnsResolver $resolver) {}

    /**
     * Validate a URL and resolve it to a single, safe IP address.
     *
     * @throws BlockedDestinationException
     */
    public function resolve(string $url): ResolvedDestination
    {
        $parts = $this->parse($url);

        if ($parts['hostIsIp']) {
            if (! $this->isPublicIp($parts['host'])) {
                throw new BlockedDestinationException('The destination IP address is not publicly routable.');
            }

            return new ResolvedDestination($url, $parts['scheme'], $parts['host'], $parts['port'], $parts['host'], true);
        }

        $addresses = $this->resolver->resolve($parts['host']);

        if ($addresses === []) {
            throw new BlockedDestinationException('The hostname could not be resolved.', dnsFailure: true);
        }

        // Reject if ANY answer is non-public: a mixed answer set is a classic rebinding setup.
        foreach ($addresses as $address) {
            if (! $this->isPublicIp($address)) {
                throw new BlockedDestinationException('The hostname resolves to a non-public IP address.');
            }
        }

        $ipv4 = array_values(array_filter($addresses, fn (string $ip) => filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false));
        $ip = $ipv4[0] ?? $addresses[0];

        return new ResolvedDestination($url, $parts['scheme'], $parts['host'], $parts['port'], $ip, false);
    }

    /**
     * Syntactic URL policy, without network access.
     *
     * @return array{scheme: string, host: string, port: int, hostIsIp: bool}
     *
     * @throws BlockedDestinationException
     */
    public function parse(string $url): array
    {
        if (strlen($url) > 2048 || preg_match('/[\s\x00-\x1F\x7F\\\\]/', $url)) {
            throw new BlockedDestinationException('The URL contains invalid characters.');
        }

        $parts = parse_url($url);

        if ($parts === false || ! isset($parts['scheme'], $parts['host'])) {
            throw new BlockedDestinationException('The URL is malformed.');
        }

        $scheme = strtolower($parts['scheme']);

        if (! in_array($scheme, ['http', 'https'], true)) {
            throw new BlockedDestinationException('Only http and https URLs are supported.');
        }

        if (isset($parts['user']) || isset($parts['pass']) || str_contains(substr($url, 0, (int) strpos($url, $parts['host'])), '@')) {
            throw new BlockedDestinationException('URLs with embedded credentials are not allowed.');
        }

        $port = $parts['port'] ?? ($scheme === 'https' ? 443 : 80);

        if (! in_array($port, config('monitraz.allowed_ports'), true)) {
            throw new BlockedDestinationException('This port is not allowed. Allowed ports: '.implode(', ', config('monitraz.allowed_ports')).'.');
        }

        $host = strtolower(rtrim($parts['host'], '.'));

        // Bracketed IPv6 literal.
        if (str_starts_with($host, '[') && str_ends_with($host, ']')) {
            $ip = substr($host, 1, -1);

            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) === false) {
                throw new BlockedDestinationException('The URL host is invalid.');
            }

            return ['scheme' => $scheme, 'host' => $ip, 'port' => $port, 'hostIsIp' => true];
        }

        // Canonical dotted-quad IPv4 literal.
        if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
            return ['scheme' => $scheme, 'host' => $host, 'port' => $port, 'hostIsIp' => true];
        }

        // Internationalised domain names are converted to their ASCII (punycode) form.
        if (preg_match('/[^\x20-\x7E]/', $host)) {
            $ascii = function_exists('idn_to_ascii') ? idn_to_ascii($host, IDNA_DEFAULT, INTL_IDNA_VARIANT_UTS46) : false;

            if ($ascii === false) {
                throw new BlockedDestinationException('The URL host is invalid.');
            }
            $host = strtolower($ascii);
        }

        // A fully qualified name whose TLD starts with a letter. This rejects
        // single-label hosts and numeric/hex/octal IP encodings like 127.1,
        // 2130706433 or 0x7f000001 that resolvers may interpret as addresses.
        $label = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
        if (strlen($host) > 253 || ! preg_match('/^(?:'.$label.'\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/', $host)) {
            throw new BlockedDestinationException('The URL host must be a public, fully qualified domain name or IP address.');
        }

        foreach (self::BLOCKED_HOST_SUFFIXES as $suffix) {
            if ($host === $suffix || str_ends_with($host, '.'.$suffix)) {
                throw new BlockedDestinationException('Internal hostnames are not allowed.');
            }
        }

        return ['scheme' => $scheme, 'host' => $host, 'port' => $port, 'hostIsIp' => false];
    }

    public function isPublicIp(string $ip): bool
    {
        $packed = @inet_pton($ip);

        if ($packed === false) {
            return false;
        }

        if (strlen($packed) === 4) {
            return ! $this->matchesAny($packed, self::BLOCKED_IPV4);
        }

        // Only the IPv6 global unicast block is public. This excludes ::, ::1,
        // IPv4-mapped/compatible (::ffff:0:0/96), NAT64 (64:ff9b::/96),
        // unique-local fc00::/7 (incl. fd00:ec2::254 metadata), link-local fe80::/10 and multicast ff00::/8.
        if (! $this->inCidr($packed, '2000::/3')) {
            return false;
        }

        return ! $this->matchesAny($packed, self::BLOCKED_IPV6);
    }

    /**
     * @param  list<string>  $cidrs
     */
    private function matchesAny(string $packed, array $cidrs): bool
    {
        foreach ($cidrs as $cidr) {
            if ($this->inCidr($packed, $cidr)) {
                return true;
            }
        }

        return false;
    }

    private function inCidr(string $packed, string $cidr): bool
    {
        [$network, $bits] = explode('/', $cidr);
        $networkPacked = inet_pton($network);

        if ($networkPacked === false || strlen($networkPacked) !== strlen($packed)) {
            return false;
        }

        $bits = (int) $bits;
        $bytes = intdiv($bits, 8);

        if (substr($packed, 0, $bytes) !== substr($networkPacked, 0, $bytes)) {
            return false;
        }

        $remaining = $bits % 8;

        if ($remaining === 0) {
            return true;
        }

        $mask = (0xFF << (8 - $remaining)) & 0xFF;

        return (ord($packed[$bytes]) & $mask) === (ord($networkPacked[$bytes]) & $mask);
    }
}
