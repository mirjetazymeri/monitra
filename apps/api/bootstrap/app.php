<?php

use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Session + CSRF protection for requests coming from the first-party SPA (Sanctum).
        $middleware->statefulApi();

        // Baseline security headers on every response. Prepended so it wraps HandleCors,
        // which answers preflight requests itself, and the headers cover those too.
        $middleware->prepend(SecurityHeaders::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // One generic body for every API 404 (missing record, endpoint owned by someone
        // else, unknown route). Laravel otherwise keeps "No query results for model
        // [App\Models\...] <id>" even with APP_DEBUG=false, leaking internal class names.
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if ($e->getStatusCode() === 404 && $request->is('api/*')) {
                return response()->json(['message' => 'Resource not found.'], 404);
            }

            return null;
        });
    })->create();
