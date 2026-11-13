<?php

namespace App\Enums;

enum EndpointStatus: string
{
    case Pending = 'pending';
    case Up = 'up';
    case Down = 'down';
}
