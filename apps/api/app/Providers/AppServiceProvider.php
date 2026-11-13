<?php

namespace App\Providers;

use App\Services\Monitoring\DnsResolver;
use App\Services\Monitoring\SystemDnsResolver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(DnsResolver::class, SystemDnsResolver::class);
    }

    public function boot(): void
    {
        Model::preventLazyLoading(! $this->app->isProduction());

        JsonResource::withoutWrapping();

        RateLimiter::for('login', fn (Request $request) => [
            Limit::perMinute(5)->by(strtolower((string) $request->input('email')).'|'.$request->ip()),
            Limit::perMinute(20)->by($request->ip()),
        ]);

        // Manual checks perform outbound requests, so they are rate limited per user.
        RateLimiter::for('manual-checks', fn (Request $request) => Limit::perMinute(10)->by((string) $request->user()?->id));

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(240)->by((string) ($request->user()?->id ?: $request->ip())));
    }
}
