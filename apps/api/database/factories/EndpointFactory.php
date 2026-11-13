<?php

namespace Database\Factories;

use App\Models\Endpoint;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Endpoint>
 */
class EndpointFactory extends Factory
{
    protected $model = Endpoint::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => ucfirst($this->faker->unique()->word()).' API',
            'url' => 'https://'.$this->faker->unique()->domainWord().'.example.com/health',
            'expected_status' => 200,
            'check_interval' => 300,
            'is_enabled' => true,
        ];
    }

    public function demo(): static
    {
        return $this->afterCreating(fn (Endpoint $endpoint) => $endpoint->forceFill(['is_demo' => true])->save());
    }

    public function disabled(): static
    {
        return $this->state(['is_enabled' => false]);
    }
}
