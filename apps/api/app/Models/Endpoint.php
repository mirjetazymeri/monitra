<?php

namespace App\Models;

use App\Enums\EndpointStatus;
use Database\Factories\EndpointFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Endpoint extends Model
{
    /** @use HasFactory<EndpointFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'url',
        'expected_status',
        'check_interval',
        'is_enabled',
    ];

    protected $attributes = [
        'current_status' => 'pending',
        'is_enabled' => true,
        'is_demo' => false,
    ];

    protected function casts(): array
    {
        return [
            'expected_status' => 'integer',
            'check_interval' => 'integer',
            'is_enabled' => 'boolean',
            'is_demo' => 'boolean',
            'current_status' => EndpointStatus::class,
            'last_checked_at' => 'datetime',
            'next_check_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function checks(): HasMany
    {
        return $this->hasMany(CheckResult::class);
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    public function latestCheck(): HasOne
    {
        return $this->hasOne(CheckResult::class)->latestOfMany('checked_at');
    }

    public function openIncident(): HasOne
    {
        return $this->hasOne(Incident::class)->where('state', 'open');
    }

    /**
     * Endpoints the scheduler should check now.
     *
     * @param  Builder<Endpoint>  $query
     */
    public function scopeDue(Builder $query): void
    {
        $query->where('is_enabled', true)
            ->where('is_demo', false)
            ->where(fn (Builder $q) => $q->whereNull('next_check_at')->orWhere('next_check_at', '<=', now()));
    }
}
