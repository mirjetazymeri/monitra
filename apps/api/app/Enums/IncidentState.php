<?php

namespace App\Enums;

enum IncidentState: string
{
    case Open = 'open';
    case Resolved = 'resolved';
}
