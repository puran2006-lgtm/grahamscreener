"use client";

import * as React from "react";
import { Star, StarOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  ticker: string;
}

interface WatchlistItem {
  ticker: string;
  thesis: string;
  targetBuyPrice: number | null;
  stopLoss: number | null;
  positionSizePct: number | null;
}

export function WatchlistToggle({ ticker }: Props) {
  const [exists, setExists] = React.useState(false);
  const [item, setItem] = React.useState<WatchlistItem | null>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const r = await fetch("/api/watchlist", { cache: "no-store" });
    const d = (await r.json()) as { items: WatchlistItem[] };
    const f = d.items.find((i) => i.ticker.toUpperCase() === ticker.toUpperCase());
    setExists(!!f);
    setItem(
      f ?? {
        ticker,
        thesis: "",
        targetBuyPrice: null,
        stopLoss: null,
        positionSizePct: null,
      }
    );
  }, [ticker]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = async () => {
    setBusy(true);
    await fetch(`/api/watchlist?ticker=${encodeURIComponent(ticker)}`, { method: "DELETE" });
    await refresh();
    setBusy(false);
  };

  const save = async () => {
    if (!item) return;
    setBusy(true);
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker,
        thesis: item.thesis,
        targetBuyPrice: item.targetBuyPrice,
        stopLoss: item.stopLoss,
        positionSizePct: item.positionSizePct,
      }),
    });
    await refresh();
    setBusy(false);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant={exists ? "default" : "outline"}
        size="sm"
        onClick={() => setOpen(true)}
        disabled={busy}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : exists ? (
          <Star className="h-4 w-4 mr-2 fill-current" />
        ) : (
          <StarOff className="h-4 w-4 mr-2" />
        )}
        {exists ? "On watchlist" : "Add to watchlist"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{exists ? "Edit" : "Add"} {ticker}</DialogTitle>
            <DialogDescription>
              Capture your thesis, target buy price, stop loss, and position sizing.
            </DialogDescription>
          </DialogHeader>
          {item && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="thesis">Thesis</Label>
                <textarea
                  id="thesis"
                  rows={4}
                  className="w-full rounded-md border border-input bg-background/40 backdrop-blur p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={item.thesis}
                  onChange={(e) => setItem({ ...item, thesis: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="target">Target buy</Label>
                  <Input
                    id="target"
                    type="number"
                    step="0.01"
                    value={item.targetBuyPrice ?? ""}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        targetBuyPrice: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stop">Stop loss</Label>
                  <Input
                    id="stop"
                    type="number"
                    step="0.01"
                    value={item.stopLoss ?? ""}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        stopLoss: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="size">Position %</Label>
                  <Input
                    id="size"
                    type="number"
                    step="0.5"
                    value={item.positionSizePct ?? ""}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        positionSizePct: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-between gap-2 pt-2">
                {exists ? (
                  <Button variant="destructive" onClick={remove} disabled={busy}>
                    Remove
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                    Cancel
                  </Button>
                  <Button onClick={save} disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
