import { cn } from "@/lib/utils";
import type { EndpointStatus } from "@/lib/api/types";

const STATUS_STYLES: Record<EndpointStatus, { label: string; dot: string; badge: string }> = {
  up: { label: "Online", dot: "bg-success", badge: "border-success/25 bg-success/10 text-success" },
  down: { label: "Offline", dot: "bg-destructive", badge: "border-destructive/30 bg-destructive/10 text-destructive" },
  pending: { label: "Pending", dot: "bg-warning", badge: "border-warning/25 bg-warning/10 text-warning" },
  paused: { label: "Paused", dot: "bg-neutral", badge: "border-border-strong bg-elevated text-muted-foreground" },
};

export function StatusDot({ status, className }: { status: EndpointStatus; className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} aria-hidden="true">
      {status === "down" && <span className="absolute inset-0 animate-ping rounded-full bg-destructive/60" />}
      <span className={cn("relative inline-flex size-2 rounded-full", STATUS_STYLES[status].dot)} />
    </span>
  );
}

export function StatusBadge({ status, className }: { status: EndpointStatus; className?: string }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap",
        style.badge,
        className,
      )}
    >
      <StatusDot status={status} />
      {style.label}
    </span>
  );
}

export function CheckBadge({ success }: { success: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap",
        success ? STATUS_STYLES.up.badge : STATUS_STYLES.down.badge,
      )}
    >
      <span className={cn("size-1.5 rounded-full", success ? "bg-success" : "bg-destructive")} aria-hidden="true" />
      {success ? "Success" : "Failure"}
    </span>
  );
}

export function IncidentStateBadge({ state }: { state: "open" | "resolved" }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap",
        state === "open" ? STATUS_STYLES.down.badge : STATUS_STYLES.up.badge,
      )}
    >
      <span className={cn("size-1.5 rounded-full", state === "open" ? "bg-destructive" : "bg-success")} aria-hidden="true" />
      {state === "open" ? "Ongoing" : "Resolved"}
    </span>
  );
}

/** Marks simulated demo content so it is never mistaken for live measurements. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      title="Simulated demo data — not a live measurement"
      className={cn(
        "inline-flex h-5 items-center rounded-md border border-cyan/25 bg-cyan/10 px-1.5 text-[11px] font-semibold tracking-wide text-cyan uppercase",
        className,
      )}
    >
      Demo
    </span>
  );
}

export function HttpStatus({ code }: { code: number | null }) {
  if (code === null) return <span className="text-subtle-foreground">—</span>;
  const tone = code < 300 ? "text-success" : code < 400 ? "text-cyan" : code < 500 ? "text-warning" : "text-destructive";
  return <span className={cn("font-mono text-xs font-semibold tabular-nums", tone)}>{code}</span>;
}
