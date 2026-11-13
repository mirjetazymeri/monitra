<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CheckResultController;
use App\Http\Controllers\Api\EndpointController;
use App\Http\Controllers\Api\IncidentController;
use App\Http\Controllers\Api\MetricsController;
use App\Http\Controllers\Api\SettingsController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', [MetricsController::class, 'dashboard']);

    Route::apiResource('endpoints', EndpointController::class);
    Route::get('/endpoints/{endpoint}/metrics', [MetricsController::class, 'endpoint']);
    Route::post('/endpoints/{endpoint}/check', [EndpointController::class, 'check'])->middleware('throttle:manual-checks');

    Route::get('/checks', [CheckResultController::class, 'index']);
    Route::get('/incidents', [IncidentController::class, 'index']);

    Route::get('/settings/monitoring', [SettingsController::class, 'monitoring']);
    Route::delete('/settings/demo-data', [SettingsController::class, 'destroyDemoData']);
});
