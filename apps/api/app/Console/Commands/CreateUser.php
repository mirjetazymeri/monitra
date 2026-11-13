<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

/**
 * Accounts are provisioned by an operator; there is no public sign-up endpoint.
 */
class CreateUser extends Command
{
    protected $signature = 'monitra:create-user {--name=} {--email=}';

    protected $description = 'Create a Monitra user account';

    public function handle(): int
    {
        $name = $this->option('name') ?: $this->ask('Name');
        $email = $this->option('email') ?: $this->ask('Email');
        $password = $this->secret('Password (min. 10 characters)');

        $validator = Validator::make(
            compact('name', 'email', 'password'),
            [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'password' => ['required', 'string', 'min:10'],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        User::create(compact('name', 'email', 'password'));

        $this->info("User {$email} created.");

        return self::SUCCESS;
    }
}
