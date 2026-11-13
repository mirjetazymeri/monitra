import type { Range } from "@/lib/api/types";

/** Chart colors reference the design-system CSS variables. */
export const CHART_COLORS = {
  primary: "var(--primary)",
  cyan: "var(--accent-cyan)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  neutral: "var(--neutral)",
  grid: "rgb(148 163 184 / 0.08)",
  axis: "var(--subtle-foreground)",
} as const;

const hourFormat = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric" });
const fullFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export function axisTick(range: Range) {
  return (iso: string) => (range === "24h" ? hourFormat.format(new Date(iso)) : dayFormat.format(new Date(iso)));
}

/** One label per day on the 7-day view (4 six-hour buckets per day). */
export function axisInterval(range: Range): number | "preserveEnd" {
  return range === "7d" ? 3 : "preserveEnd";
}

export function tooltipTime(iso: string): string {
  return fullFormat.format(new Date(iso));
}

export const axisProps = {
  stroke: CHART_COLORS.axis,
  tickLine: false,
  axisLine: false,
  fontSize: 11,
  tickMargin: 8,
} as const;

interface TooltipRow {
  label: string;
  value: string;
  color: string;
}

export function ChartTooltipCard({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="min-w-44 rounded-lg border border-border-strong bg-popover px-3 py-2.5 shadow-xl">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: row.color }} aria-hidden="true" />
              {row.label}
            </span>
            <span className="font-heading font-semibold text-foreground tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
