<?php

namespace App\Services\Monitoring;

use App\Enums\EndpointStatus;
use App\Enums\IncidentState;
use App\Models\CheckResult;
use App\Models\Endpoint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Runs checks and persists their outcome together with the incident lifecycle.
 */
class MonitoringService
{
    public function __construct(private readonly HttpChecker $checker) {}

    public function check(Endpoint $endpoint): CheckResult
    {
        if ($endpoint->is_demo) {
            throw new InvalidArgumentException('Demo endpoints contain simulated data and are never checked live.');
        }

        // The network call happens outside the transaction so no row locks are held while waiting.
        $outcome = $this->checker->check($endpoint);

        return $this->record($endpoint, $outcome, now());
    }

    /**
     * Persist a check outcome and apply incident transitions atomically:
     *  - failure, no open incident   -> open an incident
     *  - failure, open incident      -> extend it
     *  - success, open incident      -> resolve it
     */
    public function record(Endpoint $endpoint, CheckOutcome $outcome, Carbon $checkedAt): CheckResult
    {
        return DB::transaction(function () use ($endpoint, $outcome, $checkedAt) {
            /** @var Endpoint $locked */
            $locked = Endpoint::query()->lockForUpdate()->findOrFail($endpoint->id);

            $result = $locked->checks()->create([
                'status_code' => $outcome->statusCode,
                'response_time_ms' => $outcome->responseTimeMs,
                'is_success' => $outcome->success,
                'error_category' => $outcome->errorCategory,
                'is_simulated' => false,
                'checked_at' => $checkedAt,
            ]);

            $open = $locked->incidents()->where('state', IncidentState::Open)->first();

            if (! $outcome->success && $open === null) {
                $locked->incidents()->create([
                    'state' => IncidentState::Open,
                    'started_at' => $checkedAt,
                    'error_category' => $outcome->errorCategory,
                    'status_code' => $outcome->statusCode,
                    'failed_checks' => 1,
                ]);
            } elseif (! $outcome->success) {
                $open->increment('failed_checks');
            } elseif ($open !== null) {
                $open->update(['state' => IncidentState::Resolved, 'resolved_at' => $checkedAt]);
            }

            $locked->forceFill([
                'current_status' => $outcome->success ? EndpointStatus::Up : EndpointStatus::Down,
                'last_checked_at' => $checkedAt,
                'next_check_at' => $this->nextCheckAt($checkedAt, $locked->check_interval),
            ])->save();

            $endpoint->setRawAttributes($locked->getAttributes(), true);

            return $result;
        });
    }

    /**
     * The scheduler runs on minute boundaries, but a check finishes a few
     * seconds later. Anchoring the next run to the start of the minute keeps
     * the configured interval exact instead of drifting by up to a minute
     * (e.g. 10:00:02 + 5 min = 10:05:00, not 10:05:02, which would only be
     * picked up at 10:06:00).
     */
    private function nextCheckAt(Carbon $checkedAt, int $interval): Carbon
    {
        return $checkedAt->copy()->startOfMinute()->addSeconds($interval);
    }
}
