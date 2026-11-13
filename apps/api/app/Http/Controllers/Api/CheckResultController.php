<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CheckResultResource;
use App\Models\CheckResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class CheckResultController extends Controller
{
    /**
     * Server-side paginated monitoring history, scoped to the user's endpoints.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'endpoint_id' => ['nullable', 'integer', Rule::exists('endpoints', 'id')->where('user_id', $request->user()->id)],
            'status' => ['nullable', 'in:success,failure'],
            'range' => ['nullable', 'in:24h,7d,30d,all'],
            'per_page' => ['nullable', 'integer', 'between:10,100'],
            // `live` hides simulated demo results; the default `all` keeps every row (each is flagged).
            'source' => ['nullable', 'in:live,all'],
        ]);

        $since = match ($validated['range'] ?? '7d') {
            '24h' => now()->subDay(),
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            default => null,
        };

        $results = CheckResult::query()
            ->whereIn('endpoint_id', $request->user()->endpoints()->select('id'))
            ->when($validated['endpoint_id'] ?? null, fn ($q, $id) => $q->where('endpoint_id', $id))
            ->when($validated['status'] ?? null, fn ($q, $status) => $q->where('is_success', $status === 'success'))
            ->when($since, fn ($q, $from) => $q->where('checked_at', '>=', $from))
            ->when(($validated['source'] ?? 'all') === 'live', fn ($q) => $q->where('is_simulated', false))
            ->with('endpoint:id,name,url')
            ->orderByDesc('checked_at')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 25)
            ->withQueryString();

        return CheckResultResource::collection($results);
    }
}
