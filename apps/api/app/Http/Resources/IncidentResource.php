<?php

namespace App\Http\Resources;

use App\Models\Incident;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Incident
 */
class IncidentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $end = $this->resolved_at ?? now();

        return [
            'id' => $this->id,
            'endpoint_id' => $this->endpoint_id,
            'endpoint' => $this->whenLoaded('endpoint', fn () => [
                'id' => $this->endpoint->id,
                'name' => $this->endpoint->name,
                'url' => $this->endpoint->url,
                'is_demo' => $this->endpoint->is_demo,
            ]),
            'state' => $this->state->value,
            'started_at' => $this->started_at->toIso8601String(),
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'duration_seconds' => (int) max(0, $this->started_at->diffInSeconds($end)),
            'error_category' => $this->error_category?->value,
            'error_label' => $this->error_category?->label(),
            'status_code' => $this->status_code,
            'failed_checks' => $this->failed_checks,
            'is_simulated' => $this->is_simulated,
        ];
    }
}
