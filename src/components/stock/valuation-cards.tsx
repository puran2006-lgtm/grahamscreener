"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { ValuationBundle, ValuationResult } from "@/lib/valuation";
import type { Fundamentals } from "@/lib/yahoo/types";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  f: Fundamentals;
  v: ValuationBundle;
}

const items: Array<{ key: keyof ValuationBundle["mos"]; label: string; valuation: keyof ValuationBundle }> = [
  { key: "graham", label: "Graham Number", valuation: "graham" },
  { key: "ncav", label: "NCAV / share", valuation: "ncav" },
  { key: "epv", label: "EPV / share", valuation: "epv" },
  { key: "growth", label: "Graham Growth", valuation: "growth" },
];

export function ValuationCards({ f, v }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => {
        const r = v[it.valuation] as ValuationResult;
        const mos = v.mos[it.key];
        return (
          <Card key={it.key} className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {it.label}
                </div>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1.5">
                      <div className="font-mono text-[11px] text-primary">{r.formula}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Inputs:{" "}
                        {Object.entries(r.inputs)
                          .map(
                            ([k, val]) =>
                              `${k} = ${
                                val === undefined || val === null
                                  ? "—"
                                  : typeof val === "number"
                                    ? formatNum(val)
                                    : String(val)
                              }`
                          )
                          .join(", ")}
                      </div>
                      {r.notes && <div className="text-[11px] text-muted-foreground">{r.notes}</div>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {r.value === null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  formatCurrency(r.value, f.currency)
                )}
              </div>
              <MoSPill mos={mos} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function formatNum(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(2);
}

function MoSPill({ mos }: { mos: number | null }) {
  if (mos === null) {
    return (
      <div className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        Not enough data
      </div>
    );
  }
  let color = "bg-muted text-muted-foreground";
  let label = "Around fair";
  if (mos >= 0.3) {
    color = "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30";
    label = "Wide MoS";
  } else if (mos >= 0.1) {
    color = "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20";
    label = "Some MoS";
  } else if (mos >= -0.1) {
    color = "bg-amber-500/15 text-amber-400 ring-1 ring-amber-400/30";
    label = "Around fair";
  } else {
    color = "bg-rose-500/15 text-rose-400 ring-1 ring-rose-400/30";
    label = "Overvalued";
  }
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", color)}>
        {label}
      </span>
      <span className="text-xs text-muted-foreground">
        {formatPercent(mos)} margin
      </span>
    </div>
  );
}
