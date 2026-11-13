<?php

use Illuminate\Support\Facades\Route;

// The API has no server-rendered UI; the dashboard is the Next.js app in apps/web.
Route::get('/', fn () => response()->json([
    'name' => 'MonitraZ API',
    'status' => 'ok',
    'frontend' => config('cors.allowed_origins')[0] ?? null,
]));
