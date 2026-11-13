<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\IncidentResource;
use App\Models\Endpoint;
use App\Models\Incident;
use App\Services\MetricsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MetricsController extends Controller
{
    public function __construct(private readonly MetricsService $metrics) {}

    public function dashboard(Request $request): JsonResponse
    {
        $range = $this->range($request);
        $source = $request->validate(['source' => ['nullable', 'in:'.implode(',', MetricsService::SOURCES)]])['source'] ?? 'live';
        $data = $this->metrics->dashboard($request->user(), $range, $source);

        $recentIncidents = Incident::query()
            ->whereIn('endpoint_id', $this->metrics->endpointsFor($request->user(), $source)->select('id'))
            ->with('endpoint:id,name,url,is_demo')
            ->orderByDesc('started_at')
            ->limit(5)
            ->get();

        $data['recent_incidents'] = IncidentResource::collection($recentIncidents)->resolve($request);

        return response()->json($data);
    }

    public function endpoint(Request $request, Endpoint $endpoint): JsonResponse
    {
        Gate::authorize('view', $endpoint);

        return response()->json($this->metrics->endpoint($endpoint, $this->range($request)));
    }

    private function range(Request $request): string
    {
        $validated = $request->validate(['range' => ['nullable', 'in:'.implode(',', array_keys(MetricsService::RANGES))]]);

        return $validated['range'] ?? '24h';
    }
}
