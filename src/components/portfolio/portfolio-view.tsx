"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Plus, Loader2, Trash2, Upload, Download } from "lucide-react";
import { CsvImportModal } from "@/components/portfolio/csv-import-modal";
import { exportTradesToCsv } from "@/lib/csv";
import { buildPositionsFIFO } from "@/lib/portfolio";
import type { Trade } from "@/lib/db/schema";
import type { Fundamentals, Exchange } from "@/lib/yahoo/types";
import { BENCHMARK } from "@/lib/universe";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const BASE_CURRENCIES = ["USD", "AUD", "INR", "GBP", "EUR"] as const;

export function PortfolioView() {
  const [trades, setTrades] = React.useState<Trade[] | null>(null);
  const [quotes, setQuotes] = React.useState<Record<string, Fundamentals>>({});
  const [adding, setAdding] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [baseCurrency, setBaseCurrency] = React.useState<string>("USD");
  const [fxRates, setFxRates] = React.useState<Record<string, number>>({});
  const [draft, setDraft] = React.useState<Partial<Trade>>({
    side: "BUY",
    fees: 0,
    tradeDate: Date.now(),
  });

  const load = React.useCallback(async () => {
    const r = await fetch("/api/portfolio", { cache: "no-store" });
    const d = (await r.json()) as { trades: Trade[] };
    setTrades(d.trades);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const positions = React.useMemo(
    () => (trades ? Array.from(buildPositionsFIFO(trades).values()) : []),
    [trades]
  );

  React.useEffect(() => {
    const tickers = Array.from(new Set(positions.map((p) => p.ticker)));
    if (tickers.length === 0) return;
    Promise.all(
      tickers.map(async (t) => {
        try {
          const r = await fetch(`/api/yahoo/quote?ticker=${encodeURIComponent(t)}`);
          if (r.ok) {
            const d = (await r.json()) as Fundamentals;
            return [t, d] as const;
          }
        } catch {}
        return null;
      })
    ).then((rows) => {
      const map: Record<string, Fundamentals> = {};
      rows.forEach((r) => {
        if (r) map[r[0]] = r[1];
      });
      setQuotes(map);
    });
  }, [positions]);

  // Fetch FX rates when quotes are available
  React.useEffect(() => {
    const currencies = Array.from(
      new Set(Object.values(quotes).map((q) => q.currency).filter(Boolean))
    );
    if (currencies.length === 0) return;
    fetch(`/api/fx?currencies=${currencies.join(",")}`)
      .then((r) => r.json())
      .then((d: { baseCurrency: string; rates: Record<string, number> }) => {
        setBaseCurrency(d.baseCurrency);
        setFxRates(d.rates);
      })
      .catch(() => {});
  }, [quotes]);

  /** Switch base currency and refetch rates. */
  const switchCurrency = async (c: string) => {
    await fetch("/api/fx", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseCurrency: c }),
    });
    setBaseCurrency(c);
    // Refetch rates for new base
    const currencies = Array.from(
      new Set(Object.values(quotes).map((q) => q.currency).filter(Boolean))
    );
    if (currencies.length > 0) {
      const resp = await fetch(`/api/fx?currencies=${currencies.join(",")}`);
      const d = (await resp.json()) as { rates: Record<string, number> };
      setFxRates(d.rates);
    }
  };

  /** Convert a value from a source currency to base currency using FX rates. */
  const toBase = (amount: number, sourceCurrency: string): number => {
    if (sourceCurrency === baseCurrency) return amount;
    const rate = fxRates[sourceCurrency];
    return rate ? amount * rate : amount;
  };

  const submit = async () => {
    if (!draft.ticker || !draft.quantity || !draft.price || !draft.tradeDate) return;
    setBusy(true);
    try {
      await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: draft.ticker,
          side: draft.side ?? "BUY",
          quantity: Number(draft.quantity),
          price: Number(draft.price),
          fees: Number(draft.fees ?? 0),
          tradeDate: Number(draft.tradeDate),
          notes: draft.notes ?? "",
        }),
      });
      setAdding(false);
      setDraft({ side: "BUY", fees: 0, tradeDate: Date.now() });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const removeTrade = async (id: number) => {
    await fetch(`/api/portfolio?id=${id}`, { method: "DELETE" });
    await load();
  };

  /** Export all trades as a CSV download. */
  const handleExport = () => {
    if (!trades || trades.length === 0) return;
    const csv = exportTradesToCsv(trades);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grahamscreener-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // KPIs: convert each position's values into base currency
  const totalCostBasis = positions.reduce((s, p) => {
    const cur = quotes[p.ticker]?.currency ?? "USD";
    return s + toBase(p.costBasis, cur);
  }, 0);
  const totalRealized = positions.reduce((s, p) => {
    const cur = quotes[p.ticker]?.currency ?? "USD";
    return s + toBase(p.realizedPnL, cur);
  }, 0);
  const totalMarketValue = positions.reduce((s, p) => {
    const q = quotes[p.ticker];
    const px = q?.price ?? 0;
    const cur = q?.currency ?? "USD";
    return s + toBase(p.quantityHeld * px, cur);
  }, 0);
  const unrealized = totalMarketValue - totalCostBasis;
  const totalReturn = totalCostBasis > 0 ? (totalRealized + unrealized) / totalCostBasis : 0;

  if (trades === null) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
        <Skeleton className="h-72 w-full md:col-span-3" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Cost basis (open)" value={formatCurrency(totalCostBasis, baseCurrency)} />
        <KpiCard label="Market value" value={formatCurrency(totalMarketValue, baseCurrency)} />
        <KpiCard
          label="Unrealized P&L"
          value={formatCurrency(unrealized, baseCurrency)}
          tone={unrealized >= 0 ? "pos" : "neg"}
          sub={totalCostBasis > 0 ? formatPercent(unrealized / totalCostBasis) : "—"}
        />
        <KpiCard
          label="Realized P&L"
          value={formatCurrency(totalRealized, baseCurrency)}
          tone={totalRealized >= 0 ? "pos" : "neg"}
          sub={totalCostBasis > 0 ? `${formatPercent(totalReturn)} total return` : "—"}
        />
      </div>

      <Tabs defaultValue="positions">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <TabsList>
              <TabsTrigger value="positions">Positions</TabsTrigger>
              <TabsTrigger value="trades">Trades</TabsTrigger>
              <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
            </TabsList>
            <Select value={baseCurrency} onValueChange={switchCurrency}>
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BASE_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImporting(true)}>
              <Upload className="h-3.5 w-3.5 mr-1" /> Import CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!trades || trades.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4 mr-1" /> Log a trade
            </Button>
          </div>
        </div>

        <TabsContent value="positions" className="mt-4">
          {positions.filter((p) => p.quantityHeld > 0).length === 0 && totalRealized === 0 ? (
            <EmptyState
              illustration="portfolio"
              title="No positions yet"
              description="Log a buy to track open positions, average cost, and live P&L."
              ctaLabel="Log a trade"
              onCta={() => setAdding(true)}
            />
          ) : (
            <Card className="glass">
              <CardContent className="p-0 overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">Ticker</th>
                      <th className="px-2 py-3 text-right">Qty</th>
                      <th className="px-2 py-3 text-right">Avg cost</th>
                      <th className="px-2 py-3 text-right">Last</th>
                      <th className="px-2 py-3 text-right">Mkt value</th>
                      <th className="px-2 py-3 text-right">Unrealized</th>
                      <th className="px-2 py-3 text-right">Realized</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p) => {
                      const q = quotes[p.ticker];
                      const last = q?.price ?? 0;
                      const mv = p.quantityHeld * last;
                      const ur = mv - p.costBasis;
                      const urPct = p.costBasis > 0 ? ur / p.costBasis : 0;
                      const open = p.quantityHeld > 0;
                      return (
                        <tr key={p.ticker} className="border-t border-border/30">
                          <td className="px-4 py-3">
                            <Link
                              href={`/stock/${encodeURIComponent(p.ticker)}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {p.ticker}
                            </Link>
                            <span className="ml-2 text-[10px] text-muted-foreground">{p.exchange}</span>
                            {!open && (
                              <span className="ml-2 text-[10px] text-muted-foreground">(closed)</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-right font-mono">
                            {open ? formatNumber(p.quantityHeld, 2) : "—"}
                          </td>
                          <td className="px-2 py-3 text-right font-mono">
                            {open ? formatCurrency(p.avgCost, q?.currency ?? "USD") : "—"}
                          </td>
                          <td className="px-2 py-3 text-right font-mono">
                            {q ? formatCurrency(last, q.currency) : "—"}
                          </td>
                          <td className="px-2 py-3 text-right font-mono">
                            {open ? formatCurrency(mv, q?.currency ?? "USD") : "—"}
                          </td>
                          <td
                            className={`px-2 py-3 text-right font-mono ${
                              open ? (ur >= 0 ? "text-emerald-400" : "text-rose-400") : ""
                            }`}
                          >
                            {open ? `${formatCurrency(ur, q?.currency ?? "USD")} (${formatPercent(urPct)})` : "—"}
                          </td>
                          <td
                            className={`px-2 py-3 text-right font-mono ${
                              p.realizedPnL > 0
                                ? "text-emerald-400"
                                : p.realizedPnL < 0
                                  ? "text-rose-400"
                                  : ""
                            }`}
                          >
                            {p.realizedPnL === 0 ? "—" : formatCurrency(p.realizedPnL, q?.currency ?? "USD")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trades" className="mt-4">
          {trades.length === 0 ? (
            <EmptyState
              illustration="portfolio"
              title="No trades yet"
              description="Log your first buy to populate this list."
              ctaLabel="Log a trade"
              onCta={() => setAdding(true)}
            />
          ) : (
            <Card className="glass">
              <CardContent className="p-0 overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-2 py-3">Ticker</th>
                      <th className="px-2 py-3">Side</th>
                      <th className="px-2 py-3 text-right">Qty</th>
                      <th className="px-2 py-3 text-right">Price</th>
                      <th className="px-2 py-3 text-right">Fees</th>
                      <th className="px-2 py-3">Notes</th>
                      <th className="px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t) => (
                      <tr key={t.id} className="border-t border-border/30">
                        <td className="px-4 py-3 text-xs">
                          {new Date(t.tradeDate).toLocaleDateString()}
                        </td>
                        <td className="px-2 py-3">
                          <Link
                            href={`/stock/${encodeURIComponent(t.ticker)}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {t.ticker}
                          </Link>
                        </td>
                        <td className="px-2 py-3">
                          <Badge variant={t.side === "BUY" ? "success" : "warning"}>{t.side}</Badge>
                        </td>
                        <td className="px-2 py-3 text-right font-mono">{formatNumber(t.quantity, 2)}</td>
                        <td className="px-2 py-3 text-right font-mono">{formatNumber(t.price, 2)}</td>
                        <td className="px-2 py-3 text-right font-mono">{formatNumber(t.fees, 2)}</td>
                        <td className="px-2 py-3 text-xs text-muted-foreground line-clamp-1 max-w-[260px]">
                          {t.notes}
                        </td>
                        <td className="px-2 py-3">
                          <Button variant="ghost" size="icon" onClick={() => removeTrade(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="benchmark" className="mt-4">
          <BenchmarkCompare positions={positions} quotes={quotes} />
        </TabsContent>
      </Tabs>

      <CsvImportModal
        open={importing}
        onOpenChange={setImporting}
        onImported={load}
      />

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a trade</DialogTitle>
            <DialogDescription>FIFO basis. Date, ticker, side, qty, price, fees.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ticker</Label>
                <Input
                  placeholder="AAPL or RELIANCE.NS"
                  value={draft.ticker ?? ""}
                  onChange={(e) => setDraft({ ...draft, ticker: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Side</Label>
                <Select
                  value={draft.side ?? "BUY"}
                  onValueChange={(v) => setDraft({ ...draft, side: v as "BUY" | "SELL" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={draft.quantity ?? ""}
                  onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.price ?? ""}
                  onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fees</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.fees ?? 0}
                  onChange={(e) => setDraft({ ...draft, fees: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={
                  draft.tradeDate
                    ? new Date(draft.tradeDate).toISOString().slice(0, 10)
                    : ""
                }
                onChange={(e) =>
                  setDraft({ ...draft, tradeDate: new Date(e.target.value).getTime() })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save trade
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg";
}) {
  return (
    <Card className="glass">
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div
          className={`mt-1 text-2xl font-semibold ${
            tone === "pos" ? "text-emerald-400" : tone === "neg" ? "text-rose-400" : ""
          }`}
        >
          {value}
        </div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

type Position = ReturnType<typeof buildPositionsFIFO> extends Map<unknown, infer V> ? V : never;
interface BenchmarkProps {
  positions: Position[];
  quotes: Record<string, Fundamentals>;
}

function BenchmarkCompare({ positions, quotes }: BenchmarkProps) {
  const exchanges = Array.from(new Set(positions.map((p) => p.exchange))).filter(
    (e): e is Exchange => e === "ASX" || e === "BSE" || e === "NSE" || e === "US"
  );
  const [exchange, setExchange] = React.useState<Exchange>(exchanges[0] ?? "US");
  const [series, setSeries] = React.useState<Array<{ date: string; portfolio: number; benchmark: number }> | null>(
    null
  );
  const [loading, setLoading] = React.useState(false);

  const filtered = positions.filter((p) => p.exchange === exchange && p.firstBuy !== null);

  React.useEffect(() => {
    if (filtered.length === 0) {
      setSeries([]);
      return;
    }
    const earliest = Math.min(...filtered.map((p) => p.firstBuy ?? Date.now()));
    const range = pickRange(earliest);
    const bench = BENCHMARK[exchange];
    setLoading(true);
    Promise.all(
      filtered
        .map((p) =>
          fetch(`/api/yahoo/chart?ticker=${encodeURIComponent(p.ticker)}&range=${range}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
            .then((d) => (d ? { ticker: p.ticker, qty: p.quantityHeld + p.costBasis / Math.max(quotes[p.ticker]?.price ?? 1, 1e-9), basis: p.costBasis, points: d.points as Array<{ t: number; c: number }> } : null))
        )
        .concat(
          fetch(`/api/yahoo/chart?ticker=${encodeURIComponent(bench.ticker)}&range=${range}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
            .then((d) => (d ? { ticker: bench.ticker, qty: 0, basis: 0, points: d.points as Array<{ t: number; c: number }> } : null))
        )
    )
      .then((arr) => {
        const valid = arr.filter((x): x is { ticker: string; qty: number; basis: number; points: Array<{ t: number; c: number }> } => x !== null);
        const benchSeries = valid.find((v) => v.ticker === bench.ticker);
        if (!benchSeries) {
          setSeries([]);
          return;
        }
        const benchStart = benchSeries.points[0]?.c ?? 1;
        const dates = benchSeries.points.map((p) => p.t);
        const portfolioSeries = dates.map((t) => {
          let value = 0;
          let basis = 0;
          for (const v of valid) {
            if (v.ticker === bench.ticker) continue;
            const closest = v.points.find((p) => p.t >= t) ?? v.points[v.points.length - 1];
            const startPoint = v.points[0];
            if (!closest || !startPoint) continue;
            const pctChange = (closest.c - startPoint.c) / startPoint.c;
            value += filtered.find((f) => f.ticker === v.ticker)!.costBasis * (1 + pctChange);
            basis += filtered.find((f) => f.ticker === v.ticker)!.costBasis;
          }
          return basis > 0 ? value / basis - 1 : 0;
        });
        const data = dates.map((t, i) => ({
          date: new Date(t * 1000).toLocaleDateString("en-US", {
            month: "short",
            year: range === "5y" || range === "max" ? "2-digit" : undefined,
          }),
          portfolio: portfolioSeries[i] * 100,
          benchmark: ((benchSeries.points[i].c - benchStart) / benchStart) * 100,
        }));
        setSeries(data);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchange]);

  if (filtered.length === 0) {
    return (
      <EmptyState
        illustration="portfolio"
        title="No positions in this exchange"
        description="Log buys for at least one ticker to see a benchmark comparison."
      />
    );
  }

  const bench = BENCHMARK[exchange];

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Portfolio vs {bench.name}</CardTitle>
          <CardDescription>
            Cost-basis-weighted price-only return since first buy in {exchange}.
          </CardDescription>
        </div>
        <Select value={exchange} onValueChange={(v) => setExchange(v as Exchange)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {exchanges.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          {loading || series === null ? (
            <Skeleton className="h-full w-full" />
          ) : series.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              No price data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.25} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v, key) => [`${Number(v).toFixed(2)}%`, key === "portfolio" ? "Portfolio" : bench.name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="portfolio"
                  name="Portfolio"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  name={bench.name}
                  stroke="hsl(var(--chart-benchmark))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function pickRange(earliestMs: number): "1mo" | "3mo" | "6mo" | "1y" | "5y" | "max" {
  const days = (Date.now() - earliestMs) / 86400000;
  if (days <= 30) return "1mo";
  if (days <= 90) return "3mo";
  if (days <= 180) return "6mo";
  if (days <= 365) return "1y";
  if (days <= 5 * 365) return "5y";
  return "max";
}
