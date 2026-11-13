"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { useChecks, useDashboard, useEndpointMetrics, useEndpoints } from "@/hooks/use-monitraz";
import { Panel, PanelHeader } from "@/components/common/panel";
import { NativeSelect } from "@/components/common/native-select";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ChartSkeleton, RowsSkeleton } from "@/components/common/section-skeleton";
import { Pagination } from "@/components/common/pagination";
import { ResponseTimeChart } from "@/components/charts/response-time-chart";
import { ChecksTable } from "@/components/history/checks-table";
import { formatMs, formatNumber, formatPercent } from "@/lib/format";
import type { DataSource, Range } from "@/lib/api/types";

type HistoryRange = "24h" | "7d" | "30d" | "all";

export default function HistoryPage() {
  const [endpointId, setEndpointId] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [range, setRange] = useState<HistoryRange>("7d");
  const [source, setSource] = useState<DataSource>("live");
  const [page, setPage] = useState(1);

  // The chart covers the selected endpoint (or all endpoints) over 24h / 7d.
  const chartRange: Range = range === "24h" ? "24h" : "7d";
  const dashboard = useDashboard(chartRange, source);
  const hasDemo = Boolean(dashboard.data?.includes_demo_data);

  // A specific endpoint is always shown as-is (demo endpoints are labelled);
  // across all endpoints, the data source decides whether simulated rows are included.
  const effectiveSource: DataSource | undefined = endpointId ? undefined : source;

  const endpoints = useEndpoints();
  const checks = useChecks({ endpoint_id: endpointId, status: status || undefined, range, source: effectiveSource, page, per_page: 25 });
  const endpointMetrics = useEndpointMetrics(endpointId, chartRange);
  const chart = endpointId ? endpointMetrics.data : dashboard.data;

  function update<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="space-y-5">
      <div className={hasDemo ? "grid gap-3 sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-4" : "grid gap-3 sm:grid-cols-3 lg:max-w-3xl"}>
        <NativeSelect
          aria-label="Filter by endpoint"
          value={endpointId ?? ""}
          onChange={(event) => update(setEndpointId)(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">All endpoints</option>
          {endpoints.data?.map((endpoint) => (
            <option key={endpoint.id} value={endpoint.id}>
              {endpoint.name}
              {endpoint.is_demo ? " (demo)" : ""}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Filter by result" value={status} onChange={(event) => update(setStatus)(event.target.value)}>
          <option value="">All results</option>
          <option value="success">Successful only</option>
          <option value="failure">Failed only</option>
        </NativeSelect>
        <NativeSelect aria-label="Time range" value={range} onChange={(event) => update(setRange)(event.target.value as HistoryRange)}>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </NativeSelect>
        {hasDemo && (
          <NativeSelect
            aria-label="Data source"
            value={source}
            disabled={endpointId !== null}
            title={endpointId !== null ? "A selected endpoint is always shown with its own data" : undefined}
            onChange={(event) => update(setSource)(event.target.value as DataSource)}
          >
            <option value="live">Live data only</option>
            <option value="all">Include demo data</option>
          </NativeSelect>
        )}
      </div>

      <Panel>
        <PanelHeader
          title="Historical response time"
          description={`${endpointId ? "Selected endpoint" : source === "live" ? "All endpoints · live data" : "All endpoints · incl. demo data"} · ${chartRange === "24h" ? "last 24 hours" : "last 7 days"}`}
          action={
            chart && (
              <div className="flex gap-5">
                <div>
                  <p className="text-xs text-subtle-foreground">Observed uptime</p>
                  <p className="metric text-sm font-semibold text-foreground">{formatPercent(chart.checks.uptime_percent)}</p>
                </div>
                <div>
                  <p className="text-xs text-subtle-foreground">Avg. response</p>
                  <p className="metric text-sm font-semibold text-foreground">{formatMs(chart.checks.avg_response_ms)}</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs text-subtle-foreground">Checks</p>
                  <p className="metric text-sm font-semibold text-foreground">{formatNumber(chart.checks.total)}</p>
                </div>
              </div>
            )
          }
        />
        <div className="px-3 py-4 sm:px-4">
          {chart ? (
            chart.checks.total > 0 ? (
              <ResponseTimeChart series={chart.series} range={chartRange} height={220} />
            ) : (
              <EmptyState icon={History} title="No checks in this range" />
            )
          ) : (
            <ChartSkeleton height={220} />
          )}
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <PanelHeader title="Check log" description="Every recorded check, newest first" />
        <div className="mt-4 border-t border-border">
          {checks.data ? (
            checks.data.data.length > 0 ? (
              <>
                <ChecksTable checks={checks.data.data} />
                <Pagination meta={checks.data.meta} onPageChange={setPage} noun="checks" />
              </>
            ) : (
              <EmptyState icon={History} title="No checks match these filters" description="Adjust the filters or wait for the next scheduled check." />
            )
          ) : checks.error ? (
            <ErrorState description={checks.error.message} onRetry={() => checks.mutate()} />
          ) : (
            <RowsSkeleton rows={8} />
          )}
        </div>
      </Panel>
    </div>
  );
}

