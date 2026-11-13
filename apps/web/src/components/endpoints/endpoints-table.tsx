"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DemoBadge, HttpStatus, StatusBadge } from "@/components/common/status-badge";
import type { Endpoint } from "@/lib/api/types";
import { formatDateTime, formatMs, formatPercent, formatRelative, hostOf } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import { EndpointActionsMenu } from "./endpoint-actions-menu";
import { EndpointFormDialog } from "./endpoint-form-dialog";
import { DeleteEndpointDialog } from "./delete-endpoint-dialog";
import { useEndpointActions } from "./use-endpoint-actions";

interface Props {
  endpoints: Endpoint[];
  compact?: boolean;
}

function uptimeTone(value: number | null | undefined): string {
  if (value === null || value === undefined) return "text-subtle-foreground";
  if (value >= 99) return "text-success";
  if (value >= 95) return "text-warning";
  return "text-destructive";
}

export function EndpointsTable({ endpoints, compact = false }: Props) {
  const now = useNow();
  const { busy, runCheck, toggle, remove } = useEndpointActions();
  const [editing, setEditing] = useState<Endpoint | null>(null);
  const [deleting, setDeleting] = useState<Endpoint | null>(null);

  const actionsFor = (endpoint: Endpoint) => ({
    onCheck: () => void runCheck(endpoint),
    onToggle: () => void toggle(endpoint),
    onEdit: () => setEditing(endpoint),
    onDelete: () => setDeleting(endpoint),
  });

  const checkButton = (endpoint: Endpoint) => {
    const checking = busy[endpoint.id] === "check";
    const button = (
      <button
        type="button"
        onClick={() => void runCheck(endpoint)}
        disabled={endpoint.is_demo || Boolean(busy[endpoint.id])}
        aria-label={`Check ${endpoint.name} now`}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:pointer-events-none disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {checking ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
      </button>
    );
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>{button}</TooltipTrigger>
        <TooltipContent>{endpoint.is_demo ? "Demo endpoints are never checked live" : "Run a check now"}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <>
      {/* Desktop / tablet: table */}
      <div className="hidden overflow-x-auto lg:block scrollbar-thin">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="pl-5 text-xs font-medium text-subtle-foreground">Service</TableHead>
              <TableHead className="text-xs font-medium text-subtle-foreground">Status</TableHead>
              <TableHead className="text-xs font-medium text-subtle-foreground">HTTP</TableHead>
              <TableHead className="text-right text-xs font-medium text-subtle-foreground">Response</TableHead>
              {!compact && <TableHead className="text-right text-xs font-medium text-subtle-foreground">Uptime 24h</TableHead>}
              <TableHead className="text-xs font-medium text-subtle-foreground">Last checked</TableHead>
              <TableHead className="pr-5 text-right text-xs font-medium text-subtle-foreground">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {endpoints.map((endpoint) => (
              <TableRow key={endpoint.id} className={cn("border-border hover:bg-white/[0.02]", busy[endpoint.id] && "opacity-70")}>
                <TableCell className="max-w-[320px] py-3 pl-5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/endpoints/${endpoint.id}`}
                      className="truncate font-medium text-foreground hover:text-primary focus-visible:text-primary focus-visible:outline-none"
                    >
                      {endpoint.name}
                    </Link>
                    {endpoint.is_demo && <DemoBadge />}
                  </div>
                  <p className="truncate font-mono text-xs text-subtle-foreground" title={endpoint.url}>
                    {compact ? hostOf(endpoint.url) : endpoint.url}
                  </p>
                </TableCell>
                <TableCell>
                  <StatusBadge status={endpoint.status} />
                </TableCell>
                <TableCell>
                  <HttpStatus code={endpoint.latest_check?.status_code ?? null} />
                </TableCell>
                <TableCell className="text-right">
                  <span className="metric text-sm text-foreground">{formatMs(endpoint.latest_check?.response_time_ms)}</span>
                  {endpoint.latest_check?.error_label && (
                    <p className="text-xs text-destructive">{endpoint.latest_check.error_label}</p>
                  )}
                </TableCell>
                {!compact && (
                  <TableCell className="text-right">
                    <span className={cn("metric text-sm font-semibold", uptimeTone(endpoint.stats_24h?.uptime_percent))}>
                      {formatPercent(endpoint.stats_24h?.uptime_percent)}
                    </span>
                    <p className="text-xs text-subtle-foreground tabular-nums">{endpoint.stats_24h?.checks ?? 0} checks</p>
                  </TableCell>
                )}
                <TableCell>
                  <span className="text-sm text-muted-foreground" title={formatDateTime(endpoint.last_checked_at)}>
                    {formatRelative(endpoint.last_checked_at, now)}
                  </span>
                </TableCell>
                <TableCell className="pr-5">
                  <div className="flex items-center justify-end gap-1">
                    {checkButton(endpoint)}
                    <EndpointActionsMenu endpoint={endpoint} busy={Boolean(busy[endpoint.id])} {...actionsFor(endpoint)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="divide-y divide-border lg:hidden">
        {endpoints.map((endpoint) => (
          <li key={endpoint.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/endpoints/${endpoint.id}`} className="truncate font-medium text-foreground">
                    {endpoint.name}
                  </Link>
                  {endpoint.is_demo && <DemoBadge />}
                </div>
                <p className="truncate font-mono text-xs text-subtle-foreground">{hostOf(endpoint.url)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {checkButton(endpoint)}
                <EndpointActionsMenu endpoint={endpoint} busy={Boolean(busy[endpoint.id])} {...actionsFor(endpoint)} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <StatusBadge status={endpoint.status} />
              <span>
                HTTP <HttpStatus code={endpoint.latest_check?.status_code ?? null} />
              </span>
              <span className="metric text-foreground">{formatMs(endpoint.latest_check?.response_time_ms)}</span>
              {!compact && <span className={uptimeTone(endpoint.stats_24h?.uptime_percent)}>{formatPercent(endpoint.stats_24h?.uptime_percent)} 24h</span>}
              <span>{formatRelative(endpoint.last_checked_at, now)}</span>
            </div>
          </li>
        ))}
      </ul>

      <EndpointFormDialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} endpoint={editing} />
      <DeleteEndpointDialog
        endpoint={deleting}
        pending={deleting ? busy[deleting.id] === "delete" : false}
        onCancel={() => setDeleting(null)}
        onConfirm={async (endpoint) => {
          if (await remove(endpoint)) setDeleting(null);
        }}
      />
    </>
  );
}
