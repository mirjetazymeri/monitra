<?php

namespace App\Http\Resources;

use App\Models\CheckResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CheckResult
 */
class CheckResultResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'endpoint_id' => $this->endpoint_id,
            'endpoint' => $this->whenLoaded('endpoint', fn () => [
                'id' => $this->endpoint->id,
                'name' => $this->endpoint->name,
                'url' => $this->endpoint->url,
            ]),
            'status_code' => $this->status_code,
            'response_time_ms' => $this->response_time_ms,
            'is_success' => $this->is_success,
            'error_category' => $this->error_category?->value,
            'error_label' => $this->error_category?->label(),
            'is_simulated' => $this->is_simulated,
            'checked_at' => $this->checked_at->toIso8601String(),
        ];
    }
}
