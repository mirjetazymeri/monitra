<?php

namespace App\Policies;

use App\Models\Endpoint;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class EndpointPolicy
{
    /**
     * Non-owners receive 404 rather than 403 so endpoint IDs cannot be enumerated.
     */
    public function view(User $user, Endpoint $endpoint): Response
    {
        return $this->owns($user, $endpoint);
    }

    public function update(User $user, Endpoint $endpoint): Response
    {
        return $this->owns($user, $endpoint);
    }

    public function delete(User $user, Endpoint $endpoint): Response
    {
        return $this->owns($user, $endpoint);
    }

    public function check(User $user, Endpoint $endpoint): Response
    {
        if ($endpoint->user_id !== $user->id) {
            return Response::denyAsNotFound();
        }

        return $endpoint->is_demo
            ? Response::deny('Demo endpoints contain simulated data and cannot be checked live.')
            : Response::allow();
    }

    private function owns(User $user, Endpoint $endpoint): Response
    {
        return $endpoint->user_id === $user->id ? Response::allow() : Response::denyAsNotFound();
    }
}
