"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatLargeNumber, formatNumber, formatPercent } from "@/lib/utils";
import type { Fundamentals } from "@/lib/yahoo/types";

interface Props {
  f: Fundamentals;
}

export function FundamentalsTable({ f }: Props) {
  const rows: Array<[string, React.ReactNode]> = [
    ["Market Cap", formatLargeNumber(f.marketCap)],
    ["Shares Outstanding", formatLargeNumber(f.sharesOutstanding)],
    ["Sector", f.sector ?? "—"],
    ["Industry", f.industry ?? "—"],
    ["Trailing P/E", formatNumber(f.trailingPE)],
    ["Forward P/E", formatNumber(f.forwardPE)],
    ["Price / Book", formatNumber(f.priceToBook)],
    ["Price / Sales", formatNumber(f.priceToSales)],
    ["EV / EBITDA", formatNumber(f.evToEbitda)],
    ["Trailing EPS", formatCurrency(f.trailingEps, f.currency)],
    ["Book Value / Share", formatCurrency(f.bookValuePerShare, f.currency)],
    ["Current Ratio", formatNumber(f.currentRatio)],
    [
      "Debt / Equity",
      f.debtToEquity === undefined ? "—" : formatNumber(f.debtToEquity / 100, 2),
    ],
    ["Return on Equity", formatPercent(f.returnOnEquity)],
    ["Return on Assets", formatPercent(f.returnOnAssets)],
    ["Dividend Yield", formatPercent(f.dividendYield)],
    ["Payout Ratio", formatPercent(f.payoutRatio)],
    ["Revenue (TTM)", formatLargeNumber(f.revenue)],
    ["EBITDA", formatLargeNumber(f.ebitda)],
    ["Net Income", formatLargeNumber(f.netIncome)],
    ["Total Debt", formatLargeNumber(f.totalDebt)],
    ["Cash", formatLargeNumber(f.cash)],
    ["52W High", formatCurrency(f.fiftyTwoWeekHigh, f.currency)],
    ["52W Low", formatCurrency(f.fiftyTwoWeekLow, f.currency)],
    ["Beta", formatNumber(f.beta)],
  ];

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">Key fundamentals</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between border-b border-border/30 py-1.5 last:border-0"
            >
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-mono text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
