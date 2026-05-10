"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { ChartResponse } from "@/lib/yahoo/types";
import { formatNumber } from "@/lib/utils";

interface Props {
  ticker: string;
  currency?: string;
}

const RANGES: Array<{ id: "1mo" | "3mo" | "6mo" | "1y" | "5y" | "max"; label: string }> = [
  { id: "1mo", label: "1M" },
  { id: "3mo", label: "3M" },
  { id: "6mo", label: "6M" },
  { id: "1y", label: "1Y" },
  { id: "5y", label: "5Y" },
  { id: "max", label: "Max" },
];

export function PriceChart({ ticker, currency }: Props) {
  const [range, setRange] = React.useState<(typeof RANGES)[number]["id"]>("1y");
  const [data, setData] = React.useState<ChartResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/yahoo/chart?ticker=${encodeURIComponent(ticker)}&range=${range}`, {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? (r.json() as Promise<ChartResponse>) : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [ticker, range]);

  const series = React.useMemo(
    () =>
      (data?.points ?? []).map((p) => ({
        date: new Date(p.t * 1000).toLocaleDateString("en-US", {
          month: "short",
          year: range === "5y" || range === "max" ? "numeric" : undefined,
          day: range === "1mo" || range === "3mo" ? "numeric" : undefined,
        }),
        ts: p.t,
        price: p.c,
      })),
    [data, range]
  );

  const first = series[0]?.price;
  const last = series[series.length - 1]?.price;
  const change = first && last ? ((last - first) / first) * 100 : 0;
  const positive = change >= 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-xs text-muted-foreground">{currency ?? data?.currency ?? "USD"}</div>
          <div className="text-2xl font-semibold tracking-tight">
            {last ? formatNumber(last, 2) : "—"}
            <span
              className={`ml-2 text-sm font-medium ${
                positive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {positive ? "+" : ""}
              {formatNumber(change, 2)}%
            </span>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg border border-border/40 bg-card/40 p-1">
          {RANGES.map((r) => (
            <Button
              key={r.id}
              variant={range === r.id ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-72 w-full">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : series.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            No price data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="px" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={positive ? "hsl(var(--primary))" : "hsl(var(--chart-negative))"}
                    stopOpacity={0.45}
                  />
                  <stop
                    offset="100%"
                    stopColor={positive ? "hsl(var(--primary))" : "hsl(var(--chart-negative))"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.25} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                formatter={(v) => [formatNumber(Number(v), 2), "Price"]}
              />
              {data?.meta?.fiftyTwoWeekHigh && (
                <ReferenceLine
                  y={data.meta.fiftyTwoWeekHigh}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.4}
                  label={{ value: "52W H", fontSize: 10, fill: "hsl(var(--muted-foreground))", position: "left" }}
                />
              )}
              {data?.meta?.fiftyTwoWeekLow && (
                <ReferenceLine
                  y={data.meta.fiftyTwoWeekLow}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.4}
                  label={{ value: "52W L", fontSize: 10, fill: "hsl(var(--muted-foreground))", position: "left" }}
                />
              )}
              <Area
                type="monotone"
                dataKey="price"
                stroke={positive ? "hsl(var(--primary))" : "hsl(var(--chart-negative))"}
                strokeWidth={2}
                fill="url(#px)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
