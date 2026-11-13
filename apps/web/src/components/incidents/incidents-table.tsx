"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DemoBadge, HttpStatus, IncidentStateBadge } from "@/components/common/status-badge";
import type { Incident } from "@/lib/api/types";
import { formatDateTime, formatDuration } from "@/lib/format";

interface Props {
  incidents: Incident[];
  showEndpoint?: boolean;
}

export function IncidentsTable({ incidents, showEndpoint = true }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto xl:block scrollbar-thin">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {showEndpoint && <TableHead className="pl-5 text-xs font-medium text-subtle-foreground">Endpoint</TableHead>}
              <TableHead className={showEndpoint ? "text-xs font-medium text-subtle-foreground" : "pl-5 text-xs font-medium text-subtle-foreground"}>
                State
              </TableHead>
              <TableHead className="text-xs font-medium text-subtle-foreground">Cause</TableHead>
              <TableHead className="text-xs font-medium text-subtle-foreground">Started</TableHead>
              <TableHead className="text-xs font-medium text-subtle-foreground">Resolved</TableHead>
              <TableHead className="pr-5 text-right text-xs font-medium text-subtle-foreground">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((incident) => (
              <TableRow key={incident.id} className="border-border hover:bg-white/[0.02]">
                {showEndpoint && (
                  <TableCell className="max-w-[260px] py-3 pl-5">
                    <div className="flex items-center gap-2">
                      <Link href={`/endpoints/${incident.endpoint_id}`} className="truncate font-medium text-foreground hover:text-primary">
                        {incident.endpoint?.name ?? `Endpoint #${incident.endpoint_id}`}
                      </Link>
                      {incident.is_simulated && <DemoBadge />}
                    </div>
                  </TableCell>
                )}
                <TableCell className={showEndpoint ? "" : "py-3 pl-5"}>
                  <IncidentStateBadge state={incident.state} />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{incident.error_label ?? "—"}</span>
                  {incident.status_code !== null && (
                    <span className="ml-2">
                      <HttpStatus code={incident.status_code} />
                    </span>
                  )}
                  <p className="text-xs text-subtle-foreground tabular-nums">{incident.failed_checks} failed checks</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground tabular-nums">{formatDateTime(incident.started_at)}</TableCell>
                <TableCell className="text-sm text-muted-foreground tabular-nums">
                  {incident.resolved_at ? formatDateTime(incident.resolved_at) : <span className="text-destructive">Ongoing</span>}
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <span className="metric text-sm font-semibold text-foreground">{formatDuration(incident.duration_seconds)}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y divide-border xl:hidden">
        {incidents.map((incident) => (
          <li key={incident.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {showEndpoint && (
                  <div className="flex items-center gap-2">
                    <Link href={`/endpoints/${incident.endpoint_id}`} className="truncate font-medium text-foreground">
                      {incident.endpoint?.name ?? `Endpoint #${incident.endpoint_id}`}
                    </Link>
                    {incident.is_simulated && <DemoBadge />}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{incident.error_label ?? "—"}</p>
              </div>
              <IncidentStateBadge state={incident.state} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle-foreground tabular-nums">
              <span>Started {formatDateTime(incident.started_at)}</span>
              <span>Duration {formatDuration(incident.duration_seconds)}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
