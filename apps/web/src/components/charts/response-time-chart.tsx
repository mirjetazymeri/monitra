"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Range, SeriesPoint } from "@/lib/api/types";
import { formatMs } from "@/lib/format";
import { CHART_COLORS, ChartTooltipCard, axisInterval, axisProps, axisTick, tooltipTime } from "./chart-utils";

interface Props {
  series: SeriesPoint[];
  range: Range;
  height?: number;
}

export function ResponseTimeChart({ series, range, height = 260 }: Props) {
  // With only a few recorded intervals (e.g. a freshly added endpoint) a line can't be
  // drawn between points, so render them as dots to keep sparse data visible.
  const sparse = series.filter((point) => point.avg_response_ms !== null).length <= 3;

  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Average response time over time">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="rt-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="timestamp" tickFormatter={axisTick(range)} interval={axisInterval(range)} minTickGap={20} {...axisProps} />
          <YAxis width={56} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`)} {...axisProps} />
          <Tooltip
            cursor={{ stroke: CHART_COLORS.axis, strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as SeriesPoint | undefined;
              if (!active || !point) return null;
              return (
                <ChartTooltipCard
                  title={tooltipTime(point.timestamp)}
                  rows={[
                    { label: "Avg. response", value: formatMs(point.avg_response_ms), color: CHART_COLORS.primary },
                    { label: "Checks", value: String(point.checks), color: CHART_COLORS.cyan },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="avg_response_ms"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#rt-fill)"
            connectNulls={false}
            isAnimationActive={false}
            dot={sparse ? { r: 3.5, fill: CHART_COLORS.primary, strokeWidth: 0 } : false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
