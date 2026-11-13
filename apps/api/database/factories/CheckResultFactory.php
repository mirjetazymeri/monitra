<?php

namespace Database\Factories;

use App\Models\CheckResult;
use App\Models\Endpoint;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CheckResult>
 */
class CheckResultFactory extends Factory
{
    protected $model = CheckResult::class;

    public function definition(): array
    {
        return [
            'endpoint_id' => Endpoint::factory(),
            'status_code' => 200,
            'response_time_ms' => $this->faker->numberBetween(50, 500),
            'is_success' => true,
            'error_category' => null,
            'is_simulated' => false,
            'checked_at' => now()->subMinutes($this->faker->numberBetween(1, 600)),
        ];
    }

    public function failed(): static
    {
        return $this->state(['status_code' => 500, 'is_success' => false, 'error_category' => 'status_mismatch']);
    }
}
