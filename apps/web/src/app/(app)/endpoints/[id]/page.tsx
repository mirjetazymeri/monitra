"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, Gauge, History, Loader2, Pause, Pencil, Play, ShieldCheck, Timer, Trash2, Zap } from "lucide-react";
import { useChecks, useEndpoint, useEndpointMetrics, useIncidents } from "@/hooks/use-monitraz";
import { ApiError } from "@/lib/api/client";
import type { Range } from "@/lib/api/types";
import { formatDateTime, formatInterval, formatMs, formatNumber, formatPercent, formatRelative } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/common/kpi-card";
import { Panel, PanelHeader } from "@/components/common/panel";
import { Segmented } from "@/components/common/segmented";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ChartSkeleton, RowsSkeleton } from "@/components/common/section-skeleton";
import { Pagination } from "@/components/common/pagination";
import { DemoBadge, StatusBadge } from "@/components/common/status-badge";
import { ResponseTimeChart } from "@/components/charts/response-time-chart";
import { ActivityChart } from "@/components/charts/activity-chart";
import { ChecksTable } from "@/components/history/checks-table";
import { IncidentsTable } from "@/components/incidents/incidents-table";
import { EndpointFormDialog } from "@/components/endpoints/endpoint-form-dialog";
import { DeleteEndpointDialog } from "@/components/endpoints/delete-endpoint-dialog";
import { useEndpointActions } from "@/components/endpoints/use-endpoint-actions";

export default function EndpointDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  // Strict parsing: "12abc", "abc" or "0" are invalid ids, never "no filter".
  const id = /^[1-9]\d{0,17}$/.test(rawId) ? Number(rawId) : null;
  const router = useRouter();
  const now = useNow();

  const [range, setRange] = useState<Range>("24h");
  const [checksPage, setChecksPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const endpoint = useEndpoint(id);
  const metrics = useEndpointMetrics(id, range);
  const checks = useChecks({ endpoint_id: id, range: "all", page: checksPage, per_page: 10 }, id !== null);
  const incidents = useIncidents({ endpoint_id: id, per_page: 5 }, id !== null);
  const { busy, runCheck, toggle, remove } = useEndpointActions();

  // Show the endpoint's name in the browser tab once it is known (metadata can't fetch authenticated data).
  const endpointName = endpoint.data?.name;
  useEffect(() => {
    if (endpointName) document.title = `${endpointName} · MonitraZ`;
  }, [endpointName]);

  if (id === null || endpoint.error) {
    const notFound = id === null || (endpoint.error instanceof ApiError && endpoint.error.status === 404);
    return (
      <Panel>
        <ErrorState
          title={notFound ? "Endpoint not found" : "Could not load endpoint"}
          description={notFound ? "It may have been deleted, or it belongs to another account." : endpoint.error?.message}
          onRetry={notFound ? undefined : () => endpoint.mutate()}
        />
        <div className="pb-8 text-center">
          <Link href="/endpoints" className="text-sm font-medium text-primary hover:underline">
            Back to endpoints
          </Link>
        </div>
      </Panel>
    );
  }

  const e = endpoint.data;
  const action = e ? busy[e.id] : undefined;

  return (
    <div className="space-y-6">
      <Link href="/endpoints" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All endpoints
      </Link>

      <Panel className="p-5">
        {!e ? (
          <RowsSkeleton rows={2} />
        ) : (
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="min-w-0 text-2xl font-bold break-words text-foreground">{e.name}</h2>
                <StatusBadge status={e.status} />
                {e.is_demo && <DemoBadge />}
              </div>
              <a
                href={e.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-1 inline-flex max-w-full items-center gap-1.5 font-mono text-xs break-all text-subtle-foreground hover:text-primary"
              >
                {e.url}
                <ExternalLink className="size-3 shrink-0" />
              </a>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <div>
                  <dt className="inline">Expects </dt>
                  <dd className="inline font-mono text-foreground">HTTP {e.expected_status}</dd>
                </div>
                <div>
                  <dt className="inline">Every </dt>
                  <dd className="inline text-foreground">{formatInterval(e.check_interval)}</dd>
                </div>
                <div>
                  <dt className="inline">Last check </dt>
                  <dd className="inline text-foreground" title={formatDateTime(e.last_checked_at)}>
                    {formatRelative(e.last_checked_at, now)}
                  </dd>
                </div>
                {e.next_check_at && !e.is_demo && (
                  <div>
                    <dt className="inline">Next </dt>
                    <dd className="inline text-foreground">{formatRelative(e.next_check_at, now)}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button size="lg" onClick={() => void runCheck(e)} disabled={e.is_demo || Boolean(action)} title={e.is_demo ? "Demo endpoints are never checked live" : undefined}>
                {action === "check" ? <Loader2 className="animate-spin" /> : <Zap />}
                {action === "check" ? "Checking…" : "Check now"}
              </Button>
              <Button size="lg" variant="outline" onClick={() => void toggle(e)} disabled={Boolean(action)}>
                {e.is_enabled ? <Pause /> : <Play />}
                {e.is_enabled ? "Pause" : "Resume"}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setEditing(true)} disabled={Boolean(action)}>
                <Pencil />
                Edit
              </Button>
              <Button size="lg" variant="destructive" onClick={() => setDeleting(true)} disabled={Boolean(action)}>
                <Trash2 />
                Delete
              </Button>
            </div>
          </div>
        )}
      </Panel>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">Performance</h3>
        <Segmented
          label="Time range"
          value={range}
          onChange={setRange}
          options={[
            { value: "24h", label: "24h" },
            { value: "7d", label: "7 days" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Observed uptime" icon={ShieldCheck} loading={!metrics.data} value={formatPercent(metrics.data?.checks.uptime_percent)} hint="Successful ÷ recorded checks" />
        <KpiCard label="Avg. response" icon={Timer} tone="cyan" loading={!metrics.data} value={formatMs(metrics.data?.checks.avg_response_ms)} hint="Received responses only" />
        <KpiCard label="Checks recorded" icon={CheckCircle2} tone="success" loading={!metrics.data} value={formatNumber(metrics.data?.checks.total ?? 0)} hint={metrics.data ? `${formatNumber(metrics.data.checks.failed)} failed` : undefined} />
        <KpiCard
          label="Latest response"
          icon={Gauge}
          tone={e?.latest_check && !e.latest_check.is_success ? "destructive" : "primary"}
          loading={!e}
          value={formatMs(e?.latest_check?.response_time_ms)}
          hint={e?.latest_check ? (e.latest_check.error_label ?? `HTTP ${e.latest_check.status_code}`) : "No checks yet"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="Response time" description="Average per interval" />
          <div className="px-3 py-4 sm:px-4">
            {metrics.data ? (
              metrics.data.checks.total > 0 ? (
                <ResponseTimeChart series={metrics.data.series} range={range} height={240} />
              ) : (
                <EmptyState icon={Gauge} title="No checks in this range" description="Run a manual check or wait for the scheduler." />
              )
            ) : (
              <ChartSkeleton height={240} />
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Check results" description="Successful vs failed checks per interval" />
          <div className="px-3 py-4 sm:px-4">
            {metrics.data ? <ActivityChart series={metrics.data.series} range={range} height={240} /> : <ChartSkeleton height={240} />}
          </div>
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <PanelHeader
          title="Incidents"
          description="Outages detected for this endpoint"
          action={
            id && (
              <Link href={`/incidents?endpoint=${id}`} className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            )
          }
        />
        <div className="mt-4 border-t border-border">
          {incidents.data ? (
            incidents.data.data.length > 0 ? (
              <IncidentsTable incidents={incidents.data.data} showEndpoint={false} />
            ) : (
              <EmptyState icon={ShieldCheck} title="No incidents recorded" />
            )
          ) : (
            <RowsSkeleton rows={2} />
          )}
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <PanelHeader title="Recent checks" description="Most recent first" />
        <div className="mt-4 border-t border-border">
          {checks.data ? (
            checks.data.data.length > 0 ? (
              <>
                <ChecksTable checks={checks.data.data} showEndpoint={false} />
                <Pagination meta={checks.data.meta} onPageChange={setChecksPage} noun="checks" />
              </>
            ) : (
              <EmptyState icon={History} title="No checks yet" description="Results appear here after the first check runs." />
            )
          ) : (
            <RowsSkeleton />
          )}
        </div>
      </Panel>

      <EndpointFormDialog open={editing} onOpenChange={setEditing} endpoint={e} />
      <DeleteEndpointDialog
        endpoint={deleting && e ? e : null}
        pending={action === "delete"}
        onCancel={() => setDeleting(false)}
        onConfirm={async (target) => {
          // Skip revalidating the deleted endpoint (it would flash a 404 state) and leave the page.
          if (await remove(target, { skipOwnQueries: true })) router.replace("/endpoints");
        }}
      />
    </div>
  );
}
