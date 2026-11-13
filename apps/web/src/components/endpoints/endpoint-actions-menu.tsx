"use client";

import Link from "next/link";
import { BarChart3, MoreHorizontal, Pause, Pencil, Play, Trash2, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Endpoint } from "@/lib/api/types";

interface Props {
  endpoint: Endpoint;
  busy?: boolean;
  showDetailsLink?: boolean;
  onCheck: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function EndpointActionsMenu({ endpoint, busy, showDetailsLink = true, onCheck, onToggle, onEdit, onDelete }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={busy}
        aria-label={`Actions for ${endpoint.name}`}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {showDetailsLink && (
          <DropdownMenuItem render={<Link href={`/endpoints/${endpoint.id}`} />}>
            <BarChart3 />
            View details
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onCheck} disabled={endpoint.is_demo}>
          <Zap />
          {endpoint.is_demo ? "Check now (demo)" : "Check now"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggle}>
          {endpoint.is_enabled ? <Pause /> : <Play />}
          {endpoint.is_enabled ? "Pause monitoring" : "Resume monitoring"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
