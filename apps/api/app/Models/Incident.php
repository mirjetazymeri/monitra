<?php

namespace App\Models;

use App\Enums\CheckErrorCategory;
use App\Enums\IncidentState;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Incident extends Model
{
    protected $fillable = [
        'state',
        'started_at',
        'resolved_at',
        'error_category',
        'status_code',
        'failed_checks',
        'is_simulated',
    ];

    protected function casts(): array
    {
        return [
            'state' => IncidentState::class,
            'started_at' => 'datetime',
            'resolved_at' => 'datetime',
            'error_category' => CheckErrorCategory::class,
            'status_code' => 'integer',
            'failed_checks' => 'integer',
            'is_simulated' => 'boolean',
        ];
    }

    public function endpoint(): BelongsTo
    {
        return $this->belongsTo(Endpoint::class);
    }
}
