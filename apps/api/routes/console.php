<?php

use Illuminate\Support\Facades\Schedule;

// Run due health checks every minute. Requires `php artisan schedule:work` (local)
// or a cron entry running `php artisan schedule:run` every minute (servers).
Schedule::command('monitraz:check-due')
    ->everyMinute()
    ->withoutOverlapping(10);

// Enforce the check-result retention period (MONITRAZ_RETENTION_DAYS).
Schedule::command('monitraz:prune-checks')
    ->dailyAt('03:15')
    ->withoutOverlapping(60);
