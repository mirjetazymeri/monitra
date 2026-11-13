<?php

namespace App\Services\Monitoring;

/**
 * Resolves a hostname to all of its A/AAAA addresses.
 *
 * Abstracted so the destination policy can be tested deterministically
 * (e.g. simulating a public hostname that resolves to 127.0.0.1).
 */
interface DnsResolver
{
    /**
     * @return list<string> IPv4/IPv6 addresses; empty when resolution fails.
     */
    public function resolve(string $host): array;
}
