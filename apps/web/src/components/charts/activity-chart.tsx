"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Range, SeriesPoint } from "@/lib/api/types";
import { CHART_COLORS, ChartTooltipCard, axisInterval, axisProps, axisTick, tooltipTime } from "./chart-utils";

interface Props {
  series: SeriesPoint[];
  range: Range;
  height?: number;
}

/** Recorded checks per time bucket, split into successful and failed. */
export function ActivityChart({ series, range, height = 220 }: Props) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Successful and failed checks over time">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -4 }} barCategoryGap="22%">
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="timestamp" tickFormatter={axisTick(range)} interval={axisInterval(range)} minTickGap={20} {...axisProps} />
          <YAxis width={48} allowDecimals={false} {...axisProps} />
          <Tooltip
            cursor={{ fill: "rgb(148 163 184 / 0.06)" }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as SeriesPoint | undefined;
              if (!active || !point) return null;
              return (
                <ChartTooltipCard
                  title={tooltipTime(point.timestamp)}
                  rows={[
                    { label: "Successful", value: String(point.successful), color: CHART_COLORS.success },
                    { label: "Failed", value: String(point.failed), color: CHART_COLORS.destructive },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="successful" stackId="checks" fill={CHART_COLORS.success} fillOpacity={0.85} isAnimationActive={false} />
          <Bar dataKey="failed" stackId="checks" fill={CHART_COLORS.destructive} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
