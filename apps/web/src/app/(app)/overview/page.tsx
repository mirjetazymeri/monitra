"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, CheckCircle2, Gauge, ShieldCheck, Timer, XCircle } from "lucide-react";
import { useDashboard, useEndpoints } from "@/hooks/use-monitra";
import type { DataSource, Range } from "@/lib/api/types";
import { formatDateTime, formatDuration, formatMs, formatNumber, formatPercent } from "@/lib/format";
import { KpiCard } from "@/components/common/kpi-card";
import { Panel, PanelHeader } from "@/components/common/panel";
import { Segmented } from "@/components/common/segmented";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { ChartSkeleton, RowsSkeleton } from "@/components/common/section-skeleton";
import { DemoNotice } from "@/components/common/demo-notice";
import { DemoBadge, IncidentStateBadge } from "@/components/common/status-badge";
import { ResponseTimeChart } from "@/components/charts/response-time-chart";
import { ActivityChart } from "@/components/charts/activity-chart";
import { StatusDistributionChart } from "@/components/charts/status-distribution-chart";
import { EndpointsTable } from "@/components/endpoints/endpoints-table";

const RANGES: { value: Range; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 days" },
];

const SOURCES: { value: DataSource; label: string }[] = [
  { value: "live", label: "Live only" },
  { value: "all", label: "Include demo" },
];

export default function OverviewPage() {
  const [range, setRange] = useState<Range>("24h");
  const [source, setSource] = useState<DataSource>("live");
  const dashboard = useDashboard(range, source);
  const endpoints = useEndpoints();
  const data = dashboard.data;
  const loading = !data && !dashboard.error;
  const rangeLabel = range === "24h" ? "last 24 hours" : "last 7 days";
  const hasDemo = Boolean(data?.includes_demo_data);
  // The endpoint table follows the same data source as the figures above it.
  const visibleEndpoints = endpoints.data?.filter((endpoint) => source === "all" || !endpoint.is_demo);

  if (dashboard.error && !data) {
    return (
      <Panel>
        <ErrorState description={dashboard.error.message} onRetry={() => dashboard.mutate()} />
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      {hasDemo && <DemoNotice source={source} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {source === "live" ? "Live measurements" : "Live and simulated demo checks"} over the{" "}
          <span className="text-foreground">{rangeLabel}</span>.
          {data && <span className="hidden sm:inline"> Updated {formatDateTime(data.generated_at)}.</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {hasDemo && <Segmented label="Data source" value={source} options={SOURCES} onChange={setSource} />}
          <Segmented label="Time range" value={range} options={RANGES} onChange={setRange} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 [&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1">
        <KpiCard
          label="Monitored endpoints"
          icon={Activity}
          loading={loading}
          value={formatNumber(data?.endpoints.total ?? 0)}
          hint={data ? `${data.endpoints.paused} paused · ${data.endpoints.pending} pending` : undefined}
        />
        <KpiCard label="Online" icon={CheckCircle2} tone="success" loading={loading} value={formatNumber(data?.endpoints.up ?? 0)} hint="Latest check passed" />
        <KpiCard
          label="Offline"
          icon={XCircle}
          tone="destructive"
          loading={loading}
          value={formatNumber(data?.endpoints.down ?? 0)}
          hint={data ? `${data.open_incidents} open incident${data.open_incidents === 1 ? "" : "s"}` : undefined}
        />
        <KpiCard
          label="Avg. response time"
          icon={Timer}
          tone="cyan"
          loading={loading}
          value={formatMs(data?.checks.avg_response_ms)}
          hint="Received responses only"
        />
        <KpiCard
          label="Observed uptime"
          icon={ShieldCheck}
          tone="primary"
          loading={loading}
          value={formatPercent(data?.checks.uptime_percent)}
          hint={data ? `${formatNumber(data.checks.successful)} / ${formatNumber(data.checks.total)} checks passed` : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Response time" description="Average response time of received responses per interval" />
          <div className="px-3 pt-4 pb-4 sm:px-4">
            {data ? (
              data.checks.total > 0 ? (
                <ResponseTimeChart series={data.series} range={range} />
              ) : (
                <EmptyState icon={Gauge} title="No checks recorded yet" description="Start the scheduler or run a manual check to collect data." />
              )
            ) : (
              <ChartSkeleton />
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Status distribution" description="Current state of every endpoint" />
          <div className="p-5">{data ? <StatusDistributionChart endpoints={data.endpoints} /> : <ChartSkeleton height={160} />}</div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Monitoring activity" description="Successful and failed checks per interval" />
          <div className="px-3 pt-4 pb-4 sm:px-4">
            {data ? <ActivityChart series={data.series} range={range} /> : <ChartSkeleton height={220} />}
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <PanelHeader
            title="Recent incidents"
            action={
              <Link href="/incidents" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                View all <ArrowRight className="size-3" />
              </Link>
            }
          />
          <div className="flex-1 p-3">
            {!data ? (
              <RowsSkeleton rows={4} />
            ) : data.recent_incidents.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="No incidents" description="Every endpoint has stayed healthy." />
            ) : (
              <ul className="space-y-1">
                {data.recent_incidents.map((incident) => (
                  <li key={incident.id}>
                    <Link
                      href={`/endpoints/${incident.endpoint_id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-white/[0.03]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{incident.endpoint?.name}</span>
                          {incident.is_simulated && <DemoBadge />}
                        </div>
                        <p className="truncate text-xs text-subtle-foreground">
                          {incident.error_label} · {formatDateTime(incident.started_at)} · {formatDuration(incident.duration_seconds)}
                        </p>
                      </div>
                      <IncidentStateBadge state={incident.state} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Endpoints"
          description="Latest result for each monitored service"
          action={
            <Link href="/endpoints" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Manage endpoints <ArrowRight className="size-3" />
            </Link>
          }
        />
        <div className="mt-4 border-t border-border">
          {visibleEndpoints ? (
            visibleEndpoints.length > 0 ? (
              <EndpointsTable endpoints={visibleEndpoints} compact />
            ) : (
              <EmptyState
                icon={Activity}
                title="No endpoints yet"
                description="Add your first HTTP endpoint to start monitoring."
                action={
                  <Link href="/endpoints" className="text-sm font-medium text-primary hover:underline">
                    Add an endpoint
                  </Link>
                }
              />
            )
          ) : endpoints.error ? (
            <ErrorState description={endpoints.error.message} onRetry={() => endpoints.mutate()} />
          ) : (
            <RowsSkeleton />
          )}
        </div>
      </Panel>
    </div>
  );
}
