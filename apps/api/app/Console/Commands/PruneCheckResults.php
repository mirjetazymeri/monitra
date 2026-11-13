<?php

namespace App\Console\Commands;

use App\Models\CheckResult;
use Illuminate\Console\Command;

/**
 * Keeps the append-only check_results table bounded.
 */
class PruneCheckResults extends Command
{
    protected $signature = 'monitraz:prune-checks {--days= : Delete results older than this many days}';

    protected $description = 'Delete check results older than the configured retention period';

    public function handle(): int
    {
        $option = $this->option('days');
        $days = (int) ($option !== null ? $option : config('monitraz.retention_days'));

        if ($days < 1) {
            $this->error('Retention must be at least 1 day.');

            return self::FAILURE;
        }

        $cutoff = now()->subDays($days);
        $deleted = 0;

        // Delete in small batches so long-running deletes never lock the table for long.
        do {
            $ids = CheckResult::query()->where('checked_at', '<', $cutoff)->orderBy('id')->limit(1000)->pluck('id');
            $deleted += $ids->isEmpty() ? 0 : CheckResult::query()->whereKey($ids)->delete();
        } while ($ids->count() === 1000);

        $this->info("Deleted {$deleted} check result(s) older than {$days} day(s).");

        return self::SUCCESS;
    }
}
