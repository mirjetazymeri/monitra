<?php

namespace App\Services\Monitoring;

use RuntimeException;

class BlockedDestinationException extends RuntimeException
{
    public function __construct(string $reason, public readonly bool $dnsFailure = false)
    {
        parent::__construct($reason);
    }
}
