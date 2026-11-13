# MonitraZ architecture

## Overview

```
┌──────────────────────┐    cookies + JSON     ┌───────────────────────────────┐
│  Next.js dashboard   │ ────────────────────▶ │  Laravel API (Sanctum, REST)  │
│  apps/web :3000      │ ◀──────────────────── │  apps/api :8000               │
└──────────────────────┘   SWR polling (30s)   └──────────────┬────────────────┘
                                                              │ Eloquent
                         ┌──────────────────┐                 ▼
                         │ schedule:work /  │        ┌─────────────────┐
                         │ cron schedule:run│──────▶ │   MySQL 8       │
                         └────────┬─────────┘        └─────────────────┘
                                  │ monitraz:check-due
                                  ▼
                   MonitoringService → HttpChecker → DestinationGuard
                                  │
                                  ▼ pinned cURL GET (public IPs only)
                           Monitored services
```

## Backend

| Concern | Location | Notes |
| --- | --- | --- |
| HTTP handling | `app/Http/Controllers/Api/*` | Thin: validate, authorise, delegate, return a resource |
| Validation | `app/Http/Requests/EndpointRequest.php`, `app/Rules/PublicHttpUrl.php` | PATCH makes every field optional, for toggles |
| Authorisation | `app/Policies/EndpointPolicy.php` | `denyAsNotFound()` for non-owners |
| Destination policy | `app/Services/Monitoring/DestinationGuard.php` | URL policy, DNS validation, IP range blocklist |
| Transport | `app/Services/Monitoring/HttpChecker.php` | Pinned, redirect-free, size- and time-limited GET |
| Persistence and incidents | `app/Services/Monitoring/MonitoringService.php` | One transaction per result, endpoint row locked |
| Aggregations | `app/Services/MetricsService.php` | Bucketed SQL per driver (MySQL, SQLite, PostgreSQL) |
| Scheduling | `routes/console.php`, `app/Console/Commands/CheckDueEndpoints.php` | Every minute, `withoutOverlapping` and cache lock |

### Data model

```
users 1───* endpoints 1───* check_results
                     1───* incidents
```

- `endpoints.current_status` (`pending|up|down`) is a denormalised copy of the latest result, so listing and status counts don't need a subquery. `next_check_at` makes due-selection a single indexed range scan, `(is_enabled, is_demo, next_check_at)`.
- `check_results` is append-only and indexed by `(endpoint_id, checked_at)`, `(endpoint_id, is_success, checked_at)` and `checked_at`. `monitraz:prune-checks` (daily) deletes rows older than `MONITRAZ_RETENTION_DAYS` in batches of 1,000, keeping the table bounded.
- `incidents.open_endpoint_id` is a generated column (`endpoint_id` while open, `NULL` once resolved) with a **unique index**. The database itself makes a second open incident for the same endpoint impossible, even under concurrent writers.
- `is_demo` / `is_simulated` flags keep seeded data separate from live measurements. Dashboard aggregations default to `source=live`, which excludes both.

### Check lifecycle

1. `monitraz:check-due` takes a cache lock, then selects up to `MONITRAZ_SCHEDULER_BATCH_SIZE` endpoints that are enabled, not demo, and due.
2. Each endpoint is checked **sequentially**, which bounds concurrency to one outbound request at a time and keeps the worker simple and predictable.
3. `HttpChecker` asks `DestinationGuard` to resolve the URL. A blocked or unresolvable destination is recorded as a failure (`blocked_destination` / `dns_failure`) **without sending any request**.
4. The GET is sent with `CURLOPT_RESOLVE` pinned to the validated IP, no redirects, no proxy, a 5 s connect and 10 s total timeout, and a 1 MB body cap.
5. `MonitoringService::record()` runs one transaction: lock the endpoint row, insert the result, open/extend/resolve the incident, then update `current_status`, `last_checked_at` and `next_check_at`. `next_check_at` is anchored to the start of the minute the check ran in, so a check finishing at 10:00:02 with a 5-minute interval is due at the 10:05:00 scheduler tick. Without this, every interval would drift by up to a minute.

The network call happens **outside** the transaction, so no row lock is held while waiting on a slow service.

### Why sequential and not queued?

The MVP avoids Redis and queue workers. With a 10 s request timeout and the default batch of 50, a worst-case run is bounded. `withoutOverlapping` plus the command's own cache lock ensure runs never overlap. Endpoints left over from a batch are picked up on the next minute because selection is ordered by `next_check_at`. Moving `MonitoringService::check()` into a queued job is the natural scale-out path.

## SSRF threat model

| Attack | Mitigation |
| --- | --- |
| `http://127.0.0.1`, `http://[::1]`, `http://10.0.0.1` | IP literal range check |
| `http://169.254.169.254` (cloud metadata) | Link-local blocked; `fd00:ec2::254` blocked via ULA |
| `http://2130706433`, `http://0x7f000001`, `http://127.1` | Hostname must be an FQDN with an alphabetic TLD |
| `http://[::ffff:127.0.0.1]`, NAT64, 6to4, Teredo | Only IPv6 `2000::/3` minus embedded-IPv4 tunnels allowed |
| Public hostname resolving to a private IP | Every A/AAAA answer validated; any private answer rejects |
| DNS rebinding (TTL 0 flip between check and connect) | Connection pinned with `CURLOPT_RESOLVE` to the validated IP |
| Redirect to an internal address | `allow_redirects: false` |
| `HTTP_PROXY` environment variable | Proxy explicitly disabled per request |
| `file://`, `gopher://`, `ftp://` | Scheme allowlist plus Guzzle `protocols: [http, https]` |
| `user:pass@host` confusion | Embedded credentials rejected |
| Port scanning (`:22`, `:6379`) | Port allowlist (`MONITRAZ_ALLOWED_PORTS`) |
| Huge or slow responses | Body size cap via the progress abort; connect and total timeouts |

Tests: `tests/Feature/SsrfProtectionTest.php` (data-provider of 33 vectors, rebinding and mixed-answer cases, transport option assertions).

**Residual risk:** the guard trusts the resolver configured on the host. Pinning guarantees the *validated* address is the one connected to, but if your infrastructure exposes internal services on public IPs, add those ranges to the blocklist.

## Frontend

- **App Router** with a `(app)` route group whose client layout wraps every page in `AppProviders` (SWR config), `AuthGuard` (session check, redirects to `/login` on 401) and `AppShell` (sidebar and header).
- **Data access** lives only in `src/lib/api` (typed `apiRequest`, contracts, mutation services) and `src/hooks/use-monitraz.ts` (SWR hooks). Components never call `fetch` directly.
- **Polling:** monitoring queries revalidate every 30 s and on window focus. The header's Refresh revalidates every cached query.
- **No optimistic updates:** mutations wait for the API, then revalidate. Errors appear as toasts, and 422 validation errors map onto form fields.
- **Design tokens:** semantic CSS variables in `src/app/globals.css` (surfaces, text, brand, status, charts), exposed to Tailwind via `@theme`. Poppins (`font-sans`) and Manrope (`font-heading`, `.metric` with tabular figures).
- **Responsive:** the sidebar collapses on desktop (the preference persists in `localStorage`), a sheet handles navigation below `lg`, tables become stacked cards below `md`, and wide tables scroll horizontally on purpose.
