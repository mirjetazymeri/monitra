<?php

namespace App\Http\Resources;

use App\Models\Endpoint;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Endpoint
 */
class EndpointResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $checks24h = $this->checks_24h_count ?? null;
        $successful24h = $this->successful_24h_count ?? null;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'url' => $this->url,
            'expected_status' => $this->expected_status,
            'check_interval' => $this->check_interval,
            'is_enabled' => $this->is_enabled,
            'is_demo' => $this->is_demo,
            // "paused" is a presentation state for disabled endpoints.
            'status' => $this->is_enabled ? $this->current_status->value : 'paused',
            'last_checked_at' => $this->last_checked_at?->toIso8601String(),
            'next_check_at' => $this->is_enabled ? $this->next_check_at?->toIso8601String() : null,
            'latest_check' => $this->whenLoaded('latestCheck', fn ($check) => new CheckResultResource($check)),
            'open_incident' => $this->whenLoaded('openIncident', fn ($incident) => new IncidentResource($incident)),
            'stats_24h' => $this->when($checks24h !== null, fn () => [
                'checks' => (int) $checks24h,
                'successful' => (int) $successful24h,
                // Observed, check-based availability. Null when nothing was recorded.
                'uptime_percent' => $checks24h > 0 ? round($successful24h / $checks24h * 100, 2) : null,
                'avg_response_ms' => $this->avg_response_24h !== null ? (int) round((float) $this->avg_response_24h) : null,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
