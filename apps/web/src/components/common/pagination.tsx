"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import type { Paginated } from "@/lib/api/types";

interface PaginationProps {
  meta: Paginated<unknown>["meta"];
  onPageChange: (page: number) => void;
  noun: string;
}

export function Pagination({ meta, onPageChange, noun }: PaginationProps) {
  if (meta.total === 0) return null;

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 sm:flex-row">
      <p className="text-xs text-muted-foreground tabular-nums">
        Showing {formatNumber(meta.from ?? 0)}–{formatNumber(meta.to ?? 0)} of {formatNumber(meta.total)} {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={meta.current_page <= 1} onClick={() => onPageChange(meta.current_page - 1)}>
          <ChevronLeft />
          Previous
        </Button>
        <span className="px-1 text-xs text-muted-foreground tabular-nums">
          {meta.current_page} / {meta.last_page}
        </span>
        <Button variant="outline" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => onPageChange(meta.current_page + 1)}>
          Next
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
