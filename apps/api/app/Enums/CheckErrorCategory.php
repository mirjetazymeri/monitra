<?php

namespace App\Enums;

/**
 * Sanitised failure categories. Raw exception messages are never stored or
 * returned to clients, because they can leak internal network details.
 */
enum CheckErrorCategory: string
{
    case StatusMismatch = 'status_mismatch';
    case Timeout = 'timeout';
    case DnsFailure = 'dns_failure';
    case ConnectionFailed = 'connection_failed';
    case TlsError = 'tls_error';
    case BlockedDestination = 'blocked_destination';
    case ResponseTooLarge = 'response_too_large';
    case UnexpectedError = 'unexpected_error';

    public function label(): string
    {
        return match ($this) {
            self::StatusMismatch => 'Unexpected HTTP status',
            self::Timeout => 'Request timed out',
            self::DnsFailure => 'DNS resolution failed',
            self::ConnectionFailed => 'Connection failed',
            self::TlsError => 'TLS/SSL error',
            self::BlockedDestination => 'Destination blocked by security policy',
            self::ResponseTooLarge => 'Response exceeded size limit',
            self::UnexpectedError => 'Unexpected error',
        };
    }
}
