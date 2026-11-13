<?php

namespace App\Console\Commands;

use App\Models\Endpoint;
use App\Services\Monitoring\MonitoringService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Throwable;

class CheckDueEndpoints extends Command
{
    protected $signature = 'monitra:check-due {--limit= : Maximum endpoints to check in this run}';

    protected $description = 'Run HTTP health checks for all enabled endpoints that are due';

    public function handle(MonitoringService $monitoring): int
    {
        // A cache lock prevents overlapping runs even when invoked manually alongside the scheduler.
        $lock = Cache::lock('monitra:check-due', 600);

        if (! $lock->get()) {
            $this->warn('Another check run is in progress; skipping.');

            return self::SUCCESS;
        }

        try {
            $limit = (int) ($this->option('limit') ?: config('monitra.scheduler_batch_size'));

            // Checks run sequentially: concurrency is bounded to one outbound request at a time.
            $endpoints = Endpoint::query()
                ->due()
                ->orderByRaw('next_check_at IS NOT NULL')
                ->orderBy('next_check_at')
                ->limit(max(1, $limit))
                ->get();

            if ($endpoints->isEmpty()) {
                $this->info('No endpoints are due.');

                return self::SUCCESS;
            }

            $failures = 0;

            foreach ($endpoints as $endpoint) {
                try {
                    $result = $monitoring->check($endpoint);
                    $failures += $result->is_success ? 0 : 1;

                    $this->line(sprintf(
                        '%s  %-32s %s %s',
                        $result->is_success ? '<fg=green>UP  </>' : '<fg=red>DOWN</>',
                        mb_strimwidth($endpoint->name, 0, 32, '…'),
                        $result->status_code ?? '---',
                        $result->response_time_ms !== null ? $result->response_time_ms.'ms' : ($result->error_category?->value ?? ''),
                    ));
                } catch (Throwable $e) {
                    report($e);
                    $this->error("Failed to record check for endpoint #{$endpoint->id}.");
                }
            }

            $this->info(sprintf('Checked %d endpoint(s), %d failing.', $endpoints->count(), $failures));

            return self::SUCCESS;
        } finally {
            $lock->release();
        }
    }
}
