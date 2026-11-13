<?php

namespace App\Services\Monitoring;

/**
 * A URL whose host has been resolved and validated. The check request is
 * pinned to $ip, so a later DNS change cannot redirect the connection.
 */
final readonly class ResolvedDestination
{
    public function __construct(
        public string $url,
        public string $scheme,
        public string $host,
        public int $port,
        public string $ip,
        public bool $hostIsIp,
    ) {}
}
