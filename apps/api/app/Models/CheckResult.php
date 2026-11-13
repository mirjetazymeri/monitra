<?php

namespace App\Models;

use App\Enums\CheckErrorCategory;
use Database\Factories\CheckResultFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CheckResult extends Model
{
    /** @use HasFactory<CheckResultFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'status_code',
        'response_time_ms',
        'is_success',
        'error_category',
        'is_simulated',
        'checked_at',
    ];

    protected function casts(): array
    {
        return [
            'status_code' => 'integer',
            'response_time_ms' => 'integer',
            'is_success' => 'boolean',
            'is_simulated' => 'boolean',
            'error_category' => CheckErrorCategory::class,
            'checked_at' => 'datetime',
        ];
    }

    public function endpoint(): BelongsTo
    {
        return $this->belongsTo(Endpoint::class);
    }
}
