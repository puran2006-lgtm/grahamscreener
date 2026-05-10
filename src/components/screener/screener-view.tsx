"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Play, RefreshCw, LinkIcon, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty/empty-state";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { Exchange, Fundamentals } from "@/lib/yahoo/types";

interface Filters {
  exchange: Exchange;
  maxPE?: number;
  maxPB?: number;
  minCurrentRatio?: number;
  maxDebtToEquity?: number;
  minDividendYield?: number;
}

const PRESETS: Array<{ name: string; filters: Omit<Filters, "exchange"> }> = [
  { name: "Defensive (Graham)", filters: { maxPE: 15, maxPB: 1.5, minCurrentRatio: 2, maxDebtToEquity: 1 } },
  { name: "Enterprising (Graham)", filters: { maxPE: 10, maxPB: 1.2, minCurrentRatio: 1.5, maxDebtToEquity: 0.5 } },
  { name: "Income", filters: { minDividendYield: 0.03, maxPE: 25 } },
  { name: "Quality + cheap", filters: { maxPE: 20, maxPB: 3, maxDebtToEquity: 1, minCurrentRatio: 1.5 } },
];

/** Encode filters as URL search params. */
function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  p.set("ex", f.exchange);
  if (f.maxPE !== undefined) p.set("pe", String(f.maxPE));
  if (f.maxPB !== undefined) p.set("pb", String(f.maxPB));
  if (f.minCurrentRatio !== undefined) p.set("cr", String(f.minCurrentRatio));
  if (f.maxDebtToEquity !== undefined) p.set("de", String(f.maxDebtToEquity));
  if (f.minDividendYield !== undefined) p.set("dy", String(f.minDividendYield));
  return p;
}

/** Decode filters from URL search params. Returns null if no screener params present. */
function filtersFromParams(p: URLSearchParams): Filters | null {
  // Only hydrate if at least the exchange param exists
  if (!p.has("ex")) return null;
  const f: Filters = { exchange: (p.get("ex") as Exchange) || "US" };
  const pe = p.get("pe");
  if (pe) f.maxPE = Number(pe);
  const pb = p.get("pb");
  if (pb) f.maxPB = Number(pb);
  const cr = p.get("cr");
  if (cr) f.minCurrentRatio = Number(cr);
  const de = p.get("de");
  if (de) f.maxDebtToEquity = Number(de);
  const dy = p.get("dy");
  if (dy) f.minDividendYield = Number(dy);
  return f;
}

const DEFAULT_FILTERS: Filters = {
  exchange: "US",
  maxPE: 25,
  maxPB: 3,
  minCurrentRatio: 1,
  maxDebtToEquity: 2,
};

export function ScreenerView() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Hydrate from URL on first render, else use defaults
  const [filters, setFilters] = React.useState<Filters>(() => {
    return filtersFromParams(searchParams) ?? DEFAULT_FILTERS;
  });
  const [rows, setRows] = React.useState<Fundamentals[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [meta, setMeta] = React.useState<{ total: number; matched: number } | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Sync filters to URL (shallow — no server refetch)
  React.useEffect(() => {
    const params = filtersToParams(filters);
    const url = `${pathname}?${params.toString()}`;
    window.history.replaceState(null, "", url);
  }, [filters, pathname]);

  /** Copy shareable link to clipboard. */
  const copyLink = () => {
    const params = filtersToParams(filters);
    const url = `${window.location.origin}${pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/screener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = (await res.json()) as { rows: Fundamentals[]; total: number; matched: number };
      setRows(data.rows);
      setMeta({ total: data.total, matched: data.matched });
    } finally {
      setLoading(false);
    }
  };

  // Auto-run on mount
  React.useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setNum = (key: keyof Filters, v: string) => {
    if (v === "") {
      const next = { ...filters };
      delete next[key];
      setFilters(next);
    } else {
      setFilters({ ...filters, [key]: Number(v) });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1.5">
            <Label>Exchange</Label>
            <Select
              value={filters.exchange}
              onValueChange={(v) => setFilters({ ...filters, exchange: v as Exchange })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">US</SelectItem>
                <SelectItem value="ASX">ASX (Australia)</SelectItem>
                <SelectItem value="BSE">BSE (India)</SelectItem>
                <SelectItem value="NSE">NSE (India)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Max P/E</Label>
            <Input
              type="number"
              step="0.5"
              value={filters.maxPE ?? ""}
              onChange={(e) => setNum("maxPE", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max P/B</Label>
            <Input
              type="number"
              step="0.1"
              value={filters.maxPB ?? ""}
              onChange={(e) => setNum("maxPB", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Min Current Ratio</Label>
            <Input
              type="number"
              step="0.1"
              value={filters.minCurrentRatio ?? ""}
              onChange={(e) => setNum("minCurrentRatio", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max Debt/Equity</Label>
            <Input
              type="number"
              step="0.1"
              value={filters.maxDebtToEquity ?? ""}
              onChange={(e) => setNum("maxDebtToEquity", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Min Div Yield</Label>
            <Input
              type="number"
              step="0.005"
              placeholder="0.03 = 3%"
              value={filters.minDividendYield ?? ""}
              onChange={(e) => setNum("minDividendYield", e.target.value)}
            />
          </div>
        </CardContent>
        <div className="flex items-center justify-between gap-2 px-6 pb-4 flex-wrap">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Presets</span>
            {PRESETS.map((p) => (
              <Button
                key={p.name}
                variant="outline"
                size="sm"
                onClick={() => setFilters({ exchange: filters.exchange, ...p.filters })}
              >
                {p.name}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyLink}>
              {copied ? (
                <Check className="h-3.5 w-3.5 mr-1" />
              ) : (
                <LinkIcon className="h-3.5 w-3.5 mr-1" />
              )}
              {copied ? "Copied" : "Share link"}
            </Button>
            <Button onClick={run} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run screen
            </Button>
          </div>
        </div>
      </Card>

      <Card className="glass">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Results</CardTitle>
            <p className="text-xs text-muted-foreground">
              {meta ? `${meta.matched} of ${meta.total} tickers matched` : "Running…"}
              {loading && " • fetching live fundamentals"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={run} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {rows === null || loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              illustration="screener"
              title="No tickers passed your filters"
              description="Try loosening one of the constraints, or switch exchange."
            />
          ) : (
            <div className="overflow-x-auto scrollbar-thin -mx-2">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">Ticker</th>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2 text-right">Price</th>
                    <th className="px-2 py-2 text-right">P/E</th>
                    <th className="px-2 py-2 text-right">P/B</th>
                    <th className="px-2 py-2 text-right">CR</th>
                    <th className="px-2 py-2 text-right">D/E</th>
                    <th className="px-2 py-2 text-right">Yield</th>
                    <th className="px-2 py-2 text-right">ROE</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.ticker}
                      className="border-t border-border/30 hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-2 py-2">
                        <Link
                          href={`/stock/${encodeURIComponent(r.ticker)}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {r.ticker}
                        </Link>
                      </td>
                      <td className="px-2 py-2">
                        <div className="line-clamp-1 max-w-[260px]">{r.longName ?? r.shortName ?? "—"}</div>
                        <div className="text-[10px] text-muted-foreground">{r.sector ?? ""}</div>
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        {formatCurrency(r.price, r.currency)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono">{formatNumber(r.trailingPE)}</td>
                      <td className="px-2 py-2 text-right font-mono">{formatNumber(r.priceToBook)}</td>
                      <td className="px-2 py-2 text-right font-mono">{formatNumber(r.currentRatio)}</td>
                      <td className="px-2 py-2 text-right font-mono">
                        {r.debtToEquity === undefined ? "—" : formatNumber(r.debtToEquity / 100)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        {formatPercent(r.dividendYield)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        {formatPercent(r.returnOnEquity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="outline">First run is slow</Badge>
                <span>fetching ~50 tickers from Yahoo. Subsequent runs use a 24h SQLite cache.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
