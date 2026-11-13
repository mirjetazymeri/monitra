/** Response contracts of the Monitra Laravel API. */

export type EndpointStatus = "up" | "down" | "pending" | "paused";

export type ErrorCategory =
  | "status_mismatch"
  | "timeout"
  | "dns_failure"
  | "connection_failed"
  | "tls_error"
  | "blocked_destination"
  | "response_too_large"
  | "unexpected_error";

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string | null;
}

export interface CheckResult {
  id: number;
  endpoint_id: number;
  endpoint?: { id: number; name: string; url: string };
  status_code: number | null;
  response_time_ms: number | null;
  is_success: boolean;
  error_category: ErrorCategory | null;
  error_label: string | null;
  is_simulated: boolean;
  checked_at: string;
}

export interface Incident {
  id: number;
  endpoint_id: number;
  endpoint?: { id: number; name: string; url: string; is_demo: boolean };
  state: "open" | "resolved";
  started_at: string;
  resolved_at: string | null;
  duration_seconds: number;
  error_category: ErrorCategory | null;
  error_label: string | null;
  status_code: number | null;
  failed_checks: number;
  is_simulated: boolean;
}

export interface EndpointStats24h {
  checks: number;
  successful: number;
  uptime_percent: number | null;
  avg_response_ms: number | null;
}

export interface Endpoint {
  id: number;
  name: string;
  url: string;
  expected_status: number;
  check_interval: number;
  is_enabled: boolean;
  is_demo: boolean;
  status: EndpointStatus;
  last_checked_at: string | null;
  next_check_at: string | null;
  latest_check?: CheckResult | null;
  open_incident?: Incident | null;
  stats_24h?: EndpointStats24h;
  created_at: string | null;
  updated_at: string | null;
}

export interface EndpointInput {
  name: string;
  url: string;
  expected_status: number;
  check_interval: number;
  is_enabled: boolean;
}

export type Range = "24h" | "7d";

/** `live` = real measurements only; `all` = live + simulated demo data. */
export type DataSource = "live" | "all";

export interface CheckSummary {
  total: number;
  successful: number;
  failed: number;
  uptime_percent: number | null;
  avg_response_ms: number | null;
}

export interface SeriesPoint {
  timestamp: string;
  checks: number;
  successful: number;
  failed: number;
  avg_response_ms: number | null;
}

export interface Dashboard {
  range: Range;
  source: DataSource;
  generated_at: string;
  endpoints: { total: number; up: number; down: number; pending: number; paused: number };
  checks: CheckSummary;
  open_incidents: number;
  includes_demo_data: boolean;
  series: SeriesPoint[];
  recent_incidents: Incident[];
}

export interface EndpointMetrics {
  range: Range;
  checks: CheckSummary;
  series: SeriesPoint[];
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null };
}

export interface MonitoringSettings {
  connect_timeout_seconds: number;
  request_timeout_seconds: number;
  max_response_bytes: number;
  allowed_ports: number[];
  allowed_intervals: number[];
  follows_redirects: boolean;
  http_method: string;
  scheduler_batch_size: number;
  max_endpoints_per_user: number;
  retention_days: number;
}
