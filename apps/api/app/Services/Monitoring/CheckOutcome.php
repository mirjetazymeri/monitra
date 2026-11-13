<?php

namespace App\Services\Monitoring;

use App\Enums\CheckErrorCategory;

final readonly class CheckOutcome
{
    public function __construct(
        public bool $success,
        public ?int $statusCode,
        public ?int $responseTimeMs,
        public ?CheckErrorCategory $errorCategory,
    ) {}

    public static function failure(CheckErrorCategory $category, ?int $responseTimeMs = null, ?int $statusCode = null): self
    {
        return new self(false, $statusCode, $responseTimeMs, $category);
    }
}
