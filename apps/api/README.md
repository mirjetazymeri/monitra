# MonitraZ API

Laravel 13 REST API for [MonitraZ](../../README.md): authentication (Sanctum SPA sessions), endpoint management, SSRF-hardened HTTP health checks, scheduling, incidents and metrics.

```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed
php artisan serve --host=localhost --port=8000   # API
php artisan schedule:work                         # scheduler
php artisan test                                  # tests
```

See the root [README](../../README.md), [architecture](../../docs/architecture.md) and [API reference](../../docs/api.md).
