<?php

namespace App\Services\Monitoring;

class SystemDnsResolver implements DnsResolver
{
    public function resolve(string $host): array
    {
        return $this->withResolverLimits(function () use ($host): array {
            $records = @dns_get_record($host, DNS_A | DNS_AAAA);

            // `false` means the query itself failed (timeout, SERVFAIL); an empty array means the
            // name has no A/AAAA records (incl. NXDOMAIN). Only a failed query is retried, once,
            // through the system resolver, so a non-existent name never costs two lookups.
            if ($records === false) {
                $fallback = @gethostbynamel($host);

                return is_array($fallback) ? array_values(array_unique($fallback)) : [];
            }

            $addresses = [];

            foreach ($records as $record) {
                if (isset($record['ip'])) {
                    $addresses[] = $record['ip'];
                }
                if (isset($record['ipv6'])) {
                    $addresses[] = $record['ipv6'];
                }
            }

            return array_values(array_unique($addresses));
        });
    }

    /**
     * PHP's DNS functions accept no timeout and cannot be interrupted, so lookups are bounded at
     * the resolver level instead: glibc reads RES_OPTIONS on every query, which caps each attempt
     * at `dns_timeout` seconds and limits retries to `dns_attempts` (per configured nameserver).
     * An operator-provided RES_OPTIONS always wins. Resolvers that ignore RES_OPTIONS (Windows,
     * musl) keep their operating-system defaults.
     *
     * @template T
     *
     * @param  callable(): T  $lookup
     * @return T
     */
    public function withResolverLimits(callable $lookup): mixed
    {
        $previous = getenv('RES_OPTIONS');

        if ($previous !== false && $previous !== '') {
            return $lookup();
        }

        putenv('RES_OPTIONS='.$this->resolverOptions());

        try {
            return $lookup();
        } finally {
            putenv('RES_OPTIONS');
        }
    }

    public function resolverOptions(): string
    {
        $timeout = max(1, min(30, (int) config('monitraz.dns_timeout')));
        $attempts = max(1, min(5, (int) config('monitraz.dns_attempts')));

        return "timeout:{$timeout} attempts:{$attempts}";
    }
}
