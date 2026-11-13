# MonitraZ API reference

Base URL: `http://localhost:8000`. All responses are JSON. Timestamps are ISO 8601 in UTC.

## Authentication (Sanctum SPA)

```http
GET  /sanctum/csrf-cookie          → sets XSRF-TOKEN cookie (204)
POST /api/auth/login               → { "user": { id, name, email, created_at } }
     Headers: X-XSRF-TOKEN: <cookie value>, Accept: application/json
     Body:    { "email": "...", "password": "...", "remember": true }
```

Send requests with `credentials: "include"` from an origin listed in `SANCTUM_STATEFUL_DOMAINS` and `FRONTEND_URL`. Mutations must include the `X-XSRF-TOKEN` header.

| Status | Meaning |
| --- | --- |
| `401` | Not authenticated |
| `403` | Action not allowed (e.g. a live check on a demo endpoint) |
| `404` | Resource does not exist **or belongs to another user**. The body is always `{ "message": "Resource not found." }`, so internal model names are never exposed |
| `419` | CSRF token mismatch: refresh `/sanctum/csrf-cookie` |
| `422` | Validation failed: `{ message, errors: { field: [messages] } }` |
| `429` | Rate limited |

Rate limits: login 5/min per email+IP (20/min per IP), manual checks 10/min per user, other API calls 240/min per user.

## Endpoints

### `GET /api/endpoints`

Query: `search` (name/URL), `status` (`up|down|pending|paused`).

```json
[
  {
    "id": 1,
    "name": "Example Domain",
    "url": "https://example.com/",
    "expected_status": 200,
    "check_interval": 300,
    "is_enabled": true,
    "is_demo": false,
    "status": "up",
    "last_checked_at": "2026-11-13T09:28:01+00:00",
    "next_check_at": "2026-11-13T09:33:01+00:00",
    "latest_check": { "id": 42, "status_code": 200, "response_time_ms": 249, "is_success": true, "error_category": null, "error_label": null, "is_simulated": false, "checked_at": "..." },
    "open_incident": null,
    "stats_24h": { "checks": 12, "successful": 12, "uptime_percent": 100, "avg_response_ms": 263 },
    "created_at": "...",
    "updated_at": "..."
  }
]
```

`status` is `paused` when `is_enabled` is false. `uptime_percent` is `null` when no checks were recorded.

### `POST /api/endpoints` · `PUT /api/endpoints/{id}` · `PATCH /api/endpoints/{id}`

```json
{ "name": "Billing API", "url": "https://billing.example.com/health", "expected_status": 200, "check_interval": 300, "is_enabled": true }
```

| Field | Rules |
| --- | --- |
| `name` | required, 2–120 chars |
| `url` | required, http(s), ≤ 2048 chars, must pass the SSRF destination policy |
| `expected_status` | required, integer 100–599 |
| `check_interval` | required, one of `60, 300, 600, 900, 1800, 3600` |
| `is_enabled` | optional boolean |

With `PATCH`, all fields are optional (e.g. `{ "is_enabled": false }`). Changing `url` or `expected_status` resets the status to `pending` and schedules an immediate check. Returns `201` (create) or `200` with the endpoint. Creating fails with `422` once the account has `MONITRAZ_MAX_ENDPOINTS_PER_USER` live endpoints (demo endpoints do not count).

### `DELETE /api/endpoints/{id}`

`204`. Check results and incidents are deleted by cascade.

### `POST /api/endpoints/{id}/check`

Runs a check synchronously and returns the persisted result (`201`):

```json
{ "id": 99, "endpoint_id": 1, "status_code": 503, "response_time_ms": 518, "is_success": false,
  "error_category": "status_mismatch", "error_label": "Unexpected HTTP status", "is_simulated": false,
  "checked_at": "2026-11-13T09:30:12+00:00" }
```

Error categories: `status_mismatch`, `timeout`, `dns_failure`, `connection_failed`, `tls_error`, `blocked_destination`, `response_too_large`, `unexpected_error`.

### `GET /api/endpoints/{id}/metrics?range=24h|7d`

```json
{ "range": "24h",
  "checks": { "total": 288, "successful": 286, "failed": 2, "uptime_percent": 99.31, "avg_response_ms": 182 },
  "series": [ { "timestamp": "2026-11-12T10:00:00+00:00", "checks": 12, "successful": 12, "failed": 0, "avg_response_ms": 176 } ] }
```

Buckets: 1 hour for `24h` (24 points), 6 hours for `7d` (28 points). Empty buckets have `checks: 0` and `avg_response_ms: null`.

## Dashboard

### `GET /api/dashboard?range=24h|7d&source=live|all`

`source=live` (default) counts only real measurements: demo endpoints and simulated results are excluded from every figure, the series and `recent_incidents`. `source=all` includes them. `includes_demo_data` reports whether the account has demo endpoints, regardless of `source`.

```json
{ "range": "24h", "source": "live", "generated_at": "...",
  "endpoints": { "total": 10, "up": 8, "down": 2, "pending": 0, "paused": 0 },
  "checks": { "total": 848, "successful": 834, "failed": 14, "uptime_percent": 98.35, "avg_response_ms": 298 },
  "open_incidents": 2,
  "includes_demo_data": true,
  "series": [ ... ],
  "recent_incidents": [ ... 5 most recent incidents ... ] }
```

`avg_response_ms` averages checks that received an HTTP response. Timeouts and connection failures are excluded so they don't distort latency.

## History

### `GET /api/checks`

Query: `endpoint_id` (must be yours), `status` (`success|failure`), `range` (`24h|7d|30d|all`, default `7d`), `source` (`live` hides simulated rows; default `all`), `page`, `per_page` (10–100, default 25).

Returns Laravel's paginated shape: `{ data: [CheckResult + endpoint {id,name,url}], links, meta: { current_page, last_page, per_page, total, from, to } }`.

## Incidents

### `GET /api/incidents`

Query: `state` (`open|resolved`), `endpoint_id`, `page`, `per_page` (5–100, default 20). Open incidents are listed first.

```json
{ "id": 7, "endpoint_id": 4, "endpoint": { "id": 4, "name": "HTTPBin", "url": "...", "is_demo": false },
  "state": "open", "started_at": "...", "resolved_at": null, "duration_seconds": 1080,
  "error_category": "status_mismatch", "error_label": "Unexpected HTTP status", "status_code": 503,
  "failed_checks": 2, "is_simulated": false }
```

## Settings

- `GET /api/settings/monitoring`: the server-enforced policy (timeouts, size cap, ports, intervals, method, redirects, batch size, endpoint limit, retention days).
- `DELETE /api/settings/demo-data`: deletes the current user's `is_demo` endpoints. Returns `{ "deleted_endpoints": 6 }`.

## Artisan commands

| Command | Purpose |
| --- | --- |
| `php artisan monitraz:check-due [--limit=N]` | Check all due endpoints once |
| `php artisan schedule:work` | Run the scheduler locally (runs `monitraz:check-due` every minute) |
| `php artisan monitraz:create-user [--name=] [--email=]` | Create an account (password prompted) |
| `php artisan monitraz:prune-checks [--days=N]` | Delete check results older than the retention period (scheduled daily at 03:15) |
| `php artisan db:seed` | Seed or refresh the demo workspace (local/testing only; replaces demo endpoints only) |
