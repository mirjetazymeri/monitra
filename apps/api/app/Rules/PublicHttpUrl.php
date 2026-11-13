<?php

namespace App\Rules;

use App\Services\Monitoring\BlockedDestinationException;
use App\Services\Monitoring\DestinationGuard;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Validates that a URL is an http(s) URL pointing at a public destination.
 * The same guard is applied again, with IP pinning, on every check.
 */
class PublicHttpUrl implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('The :attribute must be a valid URL.');

            return;
        }

        try {
            app(DestinationGuard::class)->resolve($value);
        } catch (BlockedDestinationException $e) {
            $fail($e->getMessage());
        }
    }
}
