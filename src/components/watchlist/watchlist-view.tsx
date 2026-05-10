"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Trash2, ExternalLink, RefreshCw, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty/empty-state";
import { TickerSearch } from "@/components/ticker-search";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Fundamentals } from "@/lib/yahoo/types";

interface Item {
  id: number;
  ticker: string;
  exchange: string;
  thesis: string;
  targetBuyPrice: number | null;
  stopLoss: number | null;
  positionSizePct: number | null;
}

export function WatchlistView() {
  const [items, setItems] = React.useState<Item[] | null>(null);
  const [quotes, setQuotes] = React.useState<Record<string, Fundamentals>>({});
  const [refreshing, setRefreshing] = React.useState(false);
  const [editing, setEditing] = React.useState<Item | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch("/api/watchlist", { cache: "no-store" });
    const d = (await r.json()) as { items: Item[] };
    setItems(d.items);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const refreshQuotes = React.useCallback(async () => {
    if (!items || items.length === 0) return;
    setRefreshing(true);
    try {
      const map: Record<string, Fundamentals> = {};
      await Promise.all(
        items.map(async (it) => {
          try {
            const r = await fetch(`/api/yahoo/quote?ticker=${encodeURIComponent(it.ticker)}`);
            if (r.ok) {
              const d = (await r.json()) as Fundamentals;
              map[it.ticker] = d;
            }
          } catch {
            // ignore
          }
        })
      );
      setQuotes(map);
    } finally {
      setRefreshing(false);
    }
  }, [items]);

  React.useEffect(() => {
    refreshQuotes();
  }, [refreshQuotes]);

  const remove = async (ticker: string) => {
    await fetch(`/api/watchlist?ticker=${encodeURIComponent(ticker)}`, { method: "DELETE" });
    await load();
  };

  const seed = async () => {
    await fetch("/api/seed", { method: "POST" });
    await load();
  };

  const save = async () => {
    if (!editing) return;
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker: editing.ticker,
        thesis: editing.thesis,
        targetBuyPrice: editing.targetBuyPrice,
        stopLoss: editing.stopLoss,
        positionSizePct: editing.positionSizePct,
      }),
    });
    setEditing(null);
    await load();
  };

  if (items === null) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="glass">
          <CardContent className="p-4">
            <TickerSearch placeholder="Search a ticker, then add it from the stock page…" />
          </CardContent>
        </Card>
        <EmptyState
          illustration="watchlist"
          title="Your watchlist is empty"
          description="Search a ticker or load 5 sample names — Apple, Berkshire, CBA, Reliance, and Infosys with sample theses."
          ctaLabel="Load 5 sample items"
          onCta={seed}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <TickerSearch placeholder="Search a ticker to add…" />
          </div>
          <Button variant="outline" size="sm" onClick={refreshQuotes} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh quotes
          </Button>
          <span className="text-xs text-muted-foreground">{items.length} tickers</span>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const q = quotes[it.ticker];
          const price = q?.price;
          const targetGap =
            it.targetBuyPrice && price ? (price - it.targetBuyPrice) / it.targetBuyPrice : null;
          const stopGap =
            it.stopLoss && price ? (price - it.stopLoss) / it.stopLoss : null;
          return (
            <Card key={it.id} className="glass flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      <Link href={`/stock/${encodeURIComponent(it.ticker)}`} className="hover:underline">
                        {it.ticker}
                      </Link>
                    </CardTitle>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {q?.longName ?? q?.shortName ?? ""}
                    </div>
                  </div>
                  <Badge variant="default">{it.exchange}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-semibold">
                      {price ? formatCurrency(price, q?.currency) : <Skeleton className="h-7 w-20 inline-block" />}
                    </div>
                    {q?.dividendYield !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        Yield: {formatPercent(q.dividendYield)}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs space-y-0.5">
                    <div>
                      <span className="text-muted-foreground">Target </span>
                      {it.targetBuyPrice
                        ? formatCurrency(it.targetBuyPrice, q?.currency)
                        : "—"}
                      {targetGap !== null && (
                        <span
                          className={`ml-1 ${
                            targetGap <= 0 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          ({formatPercent(targetGap)})
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stop </span>
                      {it.stopLoss ? formatCurrency(it.stopLoss, q?.currency) : "—"}
                      {stopGap !== null && (
                        <span
                          className={`ml-1 ${
                            stopGap > 0.05 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          ({formatPercent(stopGap)})
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Size </span>
                      {it.positionSizePct ? `${it.positionSizePct}%` : "—"}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-4">{it.thesis || "(no thesis)"}</p>
              </CardContent>
              <div className="flex items-center justify-between border-t border-border/40 px-4 py-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/stock/${encodeURIComponent(it.ticker)}`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                  </Link>
                </Button>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(it)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(it.ticker)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing?.ticker}</DialogTitle>
            <DialogDescription>Update your thesis, targets, and sizing.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="thesis">Thesis</Label>
                <textarea
                  id="thesis"
                  rows={5}
                  className="w-full rounded-md border border-input bg-background/40 backdrop-blur p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={editing.thesis}
                  onChange={(e) => setEditing({ ...editing, thesis: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Target buy</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.targetBuyPrice ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        targetBuyPrice: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Stop loss</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.stopLoss ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        stopLoss: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Position %</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editing.positionSizePct ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        positionSizePct: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button onClick={save}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
