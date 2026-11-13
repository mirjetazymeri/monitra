<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * Read-only view of the monitoring policy enforced by the server.
     */
    public function monitoring(): JsonResponse
    {
        return response()->json([
            'connect_timeout_seconds' => config('monitra.connect_timeout'),
            'request_timeout_seconds' => config('monitra.request_timeout'),
            'max_response_bytes' => config('monitra.max_response_bytes'),
            'allowed_ports' => config('monitra.allowed_ports'),
            'allowed_intervals' => config('monitra.intervals'),
            'follows_redirects' => false,
            'http_method' => 'GET',
            'scheduler_batch_size' => config('monitra.scheduler_batch_size'),
            'max_endpoints_per_user' => config('monitra.max_endpoints_per_user'),
            'retention_days' => config('monitra.retention_days'),
        ]);
    }

    /**
     * Remove the simulated demo endpoints (and, by cascade, their history) for this user.
     */
    public function destroyDemoData(Request $request): JsonResponse
    {
        $deleted = $request->user()->endpoints()->where('is_demo', true)->delete();

        return response()->json(['deleted_endpoints' => $deleted]);
    }
}
