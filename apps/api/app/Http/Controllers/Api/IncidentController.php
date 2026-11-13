<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\IncidentResource;
use App\Models\Incident;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class IncidentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'state' => ['nullable', 'in:open,resolved'],
            'endpoint_id' => ['nullable', 'integer', Rule::exists('endpoints', 'id')->where('user_id', $request->user()->id)],
            'per_page' => ['nullable', 'integer', 'between:5,100'],
        ]);

        $incidents = Incident::query()
            ->whereIn('endpoint_id', $request->user()->endpoints()->select('id'))
            ->when($validated['state'] ?? null, fn ($q, $state) => $q->where('state', $state))
            ->when($validated['endpoint_id'] ?? null, fn ($q, $id) => $q->where('endpoint_id', $id))
            ->with('endpoint:id,name,url,is_demo')
            // Open incidents first, then most recent.
            ->orderByRaw("CASE WHEN state = 'open' THEN 0 ELSE 1 END")
            ->orderByDesc('started_at')
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return IncidentResource::collection($incidents);
    }
}
