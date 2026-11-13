"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Dashboard } from "@/lib/api/types";
import { CHART_COLORS, ChartTooltipCard } from "./chart-utils";

interface Props {
  endpoints: Dashboard["endpoints"];
}

export function StatusDistributionChart({ endpoints }: Props) {
  const slices = [
    { key: "up", label: "Online", value: endpoints.up, color: CHART_COLORS.success },
    { key: "down", label: "Offline", value: endpoints.down, color: CHART_COLORS.destructive },
    { key: "pending", label: "Pending", value: endpoints.pending, color: CHART_COLORS.warning },
    { key: "paused", label: "Paused", value: endpoints.paused, color: CHART_COLORS.neutral },
  ];
  const visible = slices.filter((slice) => slice.value > 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
      <div className="relative size-40 shrink-0" role="img" aria-label="Endpoint status distribution">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visible.length ? visible : [{ key: "none", label: "None", value: 1, color: "var(--elevated)" }]}
              dataKey="value"
              nameKey="label"
              innerRadius="70%"
              outerRadius="100%"
              paddingAngle={visible.length > 1 ? 3 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {(visible.length ? visible : [{ key: "none", color: "var(--elevated)" }]).map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
            {visible.length > 0 && (
              <Tooltip
                content={({ active, payload }) => {
                  const slice = payload?.[0]?.payload as (typeof slices)[number] | undefined;
                  if (!active || !slice) return null;
                  return <ChartTooltipCard title="Endpoints" rows={[{ label: slice.label, value: String(slice.value), color: slice.color }]} />;
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="metric text-3xl font-bold text-foreground">{endpoints.total}</span>
          <span className="text-xs text-muted-foreground">endpoints</span>
        </div>
      </div>

      <ul className="grid w-full grid-cols-2 gap-2 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: slice.color }} aria-hidden="true" />
              {slice.label}
            </span>
            <span className="metric text-sm font-semibold text-foreground">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
