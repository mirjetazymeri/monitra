"use client";

import useSWR, { useSWRConfig } from "swr";
import { buildUrl, API_URL } from "@/lib/api/client";
import type {
  CheckResult,
  Dashboard,
  DataSource,
  Endpoint,
  EndpointMetrics,
  Incident,
  MonitoringSettings,
  Paginated,
  Range,
  User,
} from "@/lib/api/types";

/** Polling interval for monitoring data. Values only change when checks run. */
export const POLL_INTERVAL_MS = 30_000;

const polling = { refreshInterval: POLL_INTERVAL_MS, keepPreviousData: true } as const;

/** Builds a path + query key relative to the API origin. */
function key(path: string, query?: Record<string, string | number | undefined | null>): string {
  return buildUrl(path, query).slice(API_URL.length);
}

export function useCurrentUser() {
  return useSWR<{ user: User }>("/api/auth/user", { shouldRetryOnError: false, revalidateOnFocus: true });
}

/** `live` (default) excludes simulated demo data from every figure; `all` includes it. */
export function useDashboard(range: Range, source: DataSource = "live") {
  return useSWR<Dashboard>(key("/api/dashboard", { range, source }), polling);
}

export function useEndpoints(filters: { search?: string; status?: string } = {}) {
  return useSWR<Endpoint[]>(key("/api/endpoints", filters), polling);
}

export function useEndpoint(id: number | null) {
  return useSWR<Endpoint>(id ? `/api/endpoints/${id}` : null, polling);
}

export function useEndpointMetrics(id: number | null, range: Range) {
  return useSWR<EndpointMetrics>(id ? key(`/api/endpoints/${id}/metrics`, { range }) : null, polling);
}

/**
 * `enabled: false` skips the request entirely. Callers that scope a query to a
 * specific endpoint must pass it, so an invalid id never falls back to an
 * unfiltered (all endpoints) query.
 */
export function useChecks(
  filters: { endpoint_id?: number | null; status?: string; range?: string; source?: DataSource; page?: number; per_page?: number },
  enabled = true,
) {
  return useSWR<Paginated<CheckResult>>(enabled ? key("/api/checks", filters) : null, polling);
}

export function useIncidents(filters: { state?: string; endpoint_id?: number | null; page?: number; per_page?: number }, enabled = true) {
  return useSWR<Paginated<Incident>>(enabled ? key("/api/incidents", filters) : null, polling);
}

export function useMonitoringSettings() {
  return useSWR<MonitoringSettings>("/api/settings/monitoring");
}

/** Revalidates every cached monitoring query (used by Refresh and after mutations). */
export function useRefreshAll() {
  const { mutate } = useSWRConfig();
  return () => mutate((k) => typeof k === "string" && k.startsWith("/api/") && k !== "/api/auth/user");
}
