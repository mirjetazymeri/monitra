<?php

return [

    /*
    |--------------------------------------------------------------------------
    | HTTP check transport
    |--------------------------------------------------------------------------
    |
    | Limits applied to every outbound health check. Redirects are never
    | followed and only GET requests are issued.
    |
    */

    'connect_timeout' => (int) env('MONITRAZ_CONNECT_TIMEOUT', 5),

    'request_timeout' => (int) env('MONITRAZ_REQUEST_TIMEOUT', 10),

    'max_response_bytes' => (int) env('MONITRAZ_MAX_RESPONSE_BYTES', 1024 * 1024),

    // DNS lookup limits (seconds per attempt, attempts per nameserver). Applied through
    // glibc's RES_OPTIONS; other resolvers keep their OS defaults.
    'dns_timeout' => (int) env('MONITRAZ_DNS_TIMEOUT', 2),

    'dns_attempts' => (int) env('MONITRAZ_DNS_ATTEMPTS', 2),

    'user_agent' => 'MonitraZHealthCheck/1.0 (+https://github.com/monitraz)',

    /*
    |--------------------------------------------------------------------------
    | Destination policy (SSRF protection)
    |--------------------------------------------------------------------------
    |
    | Only these TCP ports may be monitored. Destinations are additionally
    | restricted to publicly routable IP addresses (see DestinationGuard).
    |
    */

    'allowed_ports' => array_values(array_map('intval', array_filter(explode(',', (string) env('MONITRAZ_ALLOWED_PORTS', '80,443,8080,8443'))))),

    /*
    |--------------------------------------------------------------------------
    | Scheduling
    |--------------------------------------------------------------------------
    */

    // Allowed check intervals, in seconds.
    'intervals' => [60, 300, 600, 900, 1800, 3600],

    // Maximum number of endpoints checked by a single scheduler run.
    'scheduler_batch_size' => (int) env('MONITRAZ_SCHEDULER_BATCH_SIZE', 50),

    // Maximum endpoints a single account may register (fairness + abuse protection).
    'max_endpoints_per_user' => (int) env('MONITRAZ_MAX_ENDPOINTS_PER_USER', 50),

    /*
    |--------------------------------------------------------------------------
    | Retention
    |--------------------------------------------------------------------------
    |
    | Check results older than this many days are deleted daily by
    | `monitraz:prune-checks`. Incidents are kept.
    |
    */

    'retention_days' => (int) env('MONITRAZ_RETENTION_DAYS', 90),

    /*
    |--------------------------------------------------------------------------
    | Demo account (local / testing environments only)
    |--------------------------------------------------------------------------
    */

    'demo' => [
        'email' => env('DEMO_USER_EMAIL', 'demo@monitraz.test'),
        'password' => env('DEMO_USER_PASSWORD'),
    ],

];
