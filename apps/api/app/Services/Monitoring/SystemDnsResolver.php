<?php

namespace App\Services\Monitoring;

class SystemDnsResolver implements DnsResolver
{
    public function resolve(string $host): array
    {
        $addresses = [];

        $records = @dns_get_record($host, DNS_A | DNS_AAAA);

        foreach (is_array($records) ? $records : [] as $record) {
            if (isset($record['ip'])) {
                $addresses[] = $record['ip'];
            }
            if (isset($record['ipv6'])) {
                $addresses[] = $record['ipv6'];
            }
        }

        // Fall back to the system resolver (IPv4 only) if the DNS query yielded nothing.
        if ($addresses === []) {
            $fallback = @gethostbynamel($host);
            $addresses = is_array($fallback) ? $fallback : [];
        }

        return array_values(array_unique($addresses));
    }
}
