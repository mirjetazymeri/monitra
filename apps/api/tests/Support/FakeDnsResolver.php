<?php

namespace Tests\Support;

use App\Services\Monitoring\DnsResolver;

/**
 * Deterministic resolver: unknown hosts resolve to a public documentation-free address.
 */
class FakeDnsResolver implements DnsResolver
{
    /** @var array<string, list<string>> */
    public array $records = [];

    public function resolve(string $host): array
    {
        return $this->records[$host] ?? ['93.184.215.14'];
    }
}
