<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Demo content is for local evaluation only and must never be seeded in production.
        if (! app()->environment(['local', 'testing'])) {
            $this->command?->warn('Skipping DemoSeeder: demo data is only seeded in local/testing environments.');

            return;
        }

        $this->call(DemoSeeder::class);
    }
}
