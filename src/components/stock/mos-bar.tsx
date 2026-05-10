"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { ValuationBundle } from "@/lib/valuation";
import type { Fundamentals } from "@/lib/yahoo/types";

interface Props {
  f: Fundamentals;
  v: ValuationBundle;
}

const labels: Array<{ key: keyof ValuationBundle["mos"]; name: string }> = [
  { key: "graham", name: "Graham Number" },
  { key: "ncav", name: "NCAV" },
  { key: "epv", name: "EPV" },
  { key: "growth", name: "Graham Growth" },
];

export function MoSBar({ f, v }: Props) {
  const price = f.price ?? 0;
  const intrinsic = labels
    .map((l) => ({ name: l.name, value: v[l.key].value }))
    .filter((x): x is { name: string; value: number } => x.value !== null);

  const allValues = [price, ...intrinsic.map((i) => i.value)];
  const max = Math.max(...allValues, 1);
  const min = 0;
  const span = max - min || 1;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">Margin of safety vs price</CardTitle>
        <CardDescription>
          Current price {formatCurrency(price, f.currency)} compared to each model.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {intrinsic.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Not enough fundamentals to compute valuations for this ticker.
          </div>
        ) : (
          <div className="space-y-3">
            {intrinsic.map((i) => {
              const pct = ((price - min) / span) * 100;
              const ipct = ((i.value - min) / span) * 100;
              const mos = (i.value - price) / i.value;
              const positive = mos > 0;
              return (
                <div key={i.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{i.name}</span>
                    <span
                      className={`font-mono ${
                        positive ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatCurrency(i.value, f.currency)}
                    </span>
                  </div>
                  <div className="relative mt-1 h-2 rounded-full bg-muted/40 overflow-visible">
                    <div
                      className={`absolute left-0 top-0 h-2 rounded-full ${
                        positive ? "bg-emerald-500/40" : "bg-rose-500/40"
                      }`}
                      style={{ width: `${Math.min(ipct, 100)}%` }}
                    />
                    <div
                      className="absolute -top-1 h-4 w-0.5 bg-foreground"
                      style={{ left: `${Math.min(pct, 100)}%` }}
                      title={`Price ${price}`}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="block h-2 w-3 rounded-full bg-emerald-500/50" /> Above price (MoS)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="block h-2 w-3 rounded-full bg-rose-500/50" /> Below price (overvalued)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="block h-3 w-0.5 bg-foreground" /> Current price
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
