"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckBadge, DemoBadge, HttpStatus } from "@/components/common/status-badge";
import type { CheckResult } from "@/lib/api/types";
import { formatDateTime, formatMs } from "@/lib/format";

interface Props {
  checks: CheckResult[];
  showEndpoint?: boolean;
}

export function ChecksTable({ checks, showEndpoint = true }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto xl:block scrollbar-thin">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="pl-5 text-xs font-medium text-subtle-foreground">Checked at</TableHead>
              {showEndpoint && <TableHead className="text-xs font-medium text-subtle-foreground">Endpoint</TableHead>}
              <TableHead className="text-xs font-medium text-subtle-foreground">Result</TableHead>
              <TableHead className="text-xs font-medium text-subtle-foreground">HTTP</TableHead>
              <TableHead className="text-right text-xs font-medium text-subtle-foreground">Response time</TableHead>
              <TableHead className="pr-5 text-xs font-medium text-subtle-foreground">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.map((check) => (
              <TableRow key={check.id} className="border-border hover:bg-white/[0.02]">
                <TableCell className="py-2.5 pl-5 text-sm text-muted-foreground tabular-nums">{formatDateTime(check.checked_at)}</TableCell>
                {showEndpoint && (
                  <TableCell className="max-w-[240px]">
                    <Link href={`/endpoints/${check.endpoint_id}`} className="block truncate text-sm font-medium text-foreground hover:text-primary">
                      {check.endpoint?.name ?? `#${check.endpoint_id}`}
                    </Link>
                  </TableCell>
                )}
                <TableCell>
                  <CheckBadge success={check.is_success} />
                </TableCell>
                <TableCell>
                  <HttpStatus code={check.status_code} />
                </TableCell>
                <TableCell className="text-right">
                  <span className="metric text-sm text-foreground">{formatMs(check.response_time_ms)}</span>
                </TableCell>
                <TableCell className="pr-5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{check.error_label ?? "OK"}</span>
                    {check.is_simulated && <DemoBadge />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y divide-border xl:hidden">
        {checks.map((check) => (
          <li key={check.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              {showEndpoint && <p className="truncate text-sm font-medium text-foreground">{check.endpoint?.name}</p>}
              <p className="text-xs text-subtle-foreground tabular-nums">{formatDateTime(check.checked_at)}</p>
              {check.error_label && <p className="text-xs text-destructive">{check.error_label}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <CheckBadge success={check.is_success} />
              <span className="text-xs text-muted-foreground">
                <HttpStatus code={check.status_code} /> · <span className="metric">{formatMs(check.response_time_ms)}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
