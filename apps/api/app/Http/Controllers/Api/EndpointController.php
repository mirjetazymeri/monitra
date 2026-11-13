<?php

namespace App\Http\Controllers\Api;

use App\Enums\EndpointStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\EndpointRequest;
use App\Http\Resources\CheckResultResource;
use App\Http\Resources\EndpointResource;
use App\Models\Endpoint;
use App\Services\Monitoring\MonitoringService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class EndpointController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'in:up,down,pending,paused'],
        ]);

        $endpoints = $this->withListData($request->user()->endpoints()->getQuery())
            ->when($request->filled('search'), function (Builder $q) use ($request) {
                $term = '%'.str_replace(['%', '_'], ['\%', '\_'], (string) $request->input('search')).'%';
                $q->where(fn (Builder $w) => $w->where('name', 'like', $term)->orWhere('url', 'like', $term));
            })
            ->when($request->input('status'), function (Builder $q, string $status) {
                $status === 'paused'
                    ? $q->where('is_enabled', false)
                    : $q->where('is_enabled', true)->where('current_status', $status);
            })
            ->orderBy('is_demo')
            ->orderBy('name')
            ->get();

        return EndpointResource::collection($endpoints);
    }

    public function store(EndpointRequest $request): EndpointResource
    {
        $endpoint = $request->user()->endpoints()->create($request->validated());
        // Schedule the first check immediately.
        $endpoint->forceFill(['next_check_at' => now()])->save();

        return new EndpointResource($endpoint->refresh()->load(['latestCheck', 'openIncident']));
    }

    public function show(Request $request, Endpoint $endpoint): EndpointResource
    {
        Gate::authorize('view', $endpoint);

        $endpoint = $this->withListData(Endpoint::query()->whereKey($endpoint->id))->firstOrFail();

        return new EndpointResource($endpoint);
    }

    public function update(EndpointRequest $request, Endpoint $endpoint): EndpointResource
    {
        Gate::authorize('update', $endpoint);

        $endpoint->fill($request->validated());

        // A changed target or expectation invalidates the current status: re-check soon.
        if ($endpoint->isDirty(['url', 'expected_status'])) {
            $endpoint->current_status = EndpointStatus::Pending;
            $endpoint->next_check_at = now();
        }
        if ($endpoint->isDirty('is_enabled') && $endpoint->is_enabled) {
            $endpoint->next_check_at = now();
        }

        $endpoint->save();

        return new EndpointResource($endpoint->load(['latestCheck', 'openIncident']));
    }

    public function destroy(Endpoint $endpoint): Response
    {
        Gate::authorize('delete', $endpoint);

        // Check results and incidents are removed by ON DELETE CASCADE.
        $endpoint->delete();

        return response()->noContent();
    }

    /**
     * Run an authorised, rate-limited manual check right now.
     */
    public function check(Endpoint $endpoint, MonitoringService $monitoring): CheckResultResource
    {
        Gate::authorize('check', $endpoint);

        $result = $monitoring->check($endpoint);

        return new CheckResultResource($result);
    }

    /**
     * @param  Builder<Endpoint>  $query
     * @return Builder<Endpoint>
     */
    private function withListData(Builder $query): Builder
    {
        $since = now()->subDay();

        return $query
            ->with(['latestCheck', 'openIncident'])
            ->withCount([
                'checks as checks_24h_count' => fn (Builder $q) => $q->where('checked_at', '>=', $since),
                'checks as successful_24h_count' => fn (Builder $q) => $q->where('checked_at', '>=', $since)->where('is_success', true),
            ])
            ->withAvg(['checks as avg_response_24h' => fn (Builder $q) => $q->where('checked_at', '>=', $since)->whereNotNull('status_code')], 'response_time_ms');
    }
}
