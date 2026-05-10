import Link from "next/link";
import { yahooFundamentals } from "@/lib/yahoo/client";
import { computeValuations } from "@/lib/valuation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PriceChart } from "@/components/charts/price-chart";
import { FundamentalsTable } from "@/components/stock/fundamentals-table";
import { ValuationCards } from "@/components/stock/valuation-cards";
import { MoSBar } from "@/components/stock/mos-bar";
import { WatchlistToggle } from "@/components/stock/watchlist-toggle";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import type { Fundamentals } from "@/lib/yahoo/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getFundamentals(ticker: string): Promise<Fundamentals | null> {
  const db = await getDb();
  const cached = await db
    .select()
    .from(schema.snapshotCache)
    .where(eq(schema.snapshotCache.ticker, ticker))
    .get();
  if (cached && Date.now() - cached.fetchedAt < 1000 * 60 * 60) {
    try {
      return JSON.parse(cached.payload) as Fundamentals;
    } catch {
      // fallthrough to live fetch
    }
  }
  try {
    const f = await yahooFundamentals(ticker);
    await db.insert(schema.snapshotCache)
      .values({
        ticker,
        exchange: f.exchange,
        payload: JSON.stringify(f),
        fetchedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: schema.snapshotCache.ticker,
        set: { payload: JSON.stringify(f), fetchedAt: Date.now(), exchange: f.exchange },
      })
      .run();
    return f;
  } catch {
    if (cached) {
      try {
        return JSON.parse(cached.payload) as Fundamentals;
      } catch {
        return null;
      }
    }
    return null;
  }
}

interface PageProps {
  params: { ticker: string };
}

export default async function StockPage({ params }: PageProps) {
  const ticker = decodeURIComponent(params.ticker).toUpperCase();
  const f = await getFundamentals(ticker);
  if (!f) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
        </Button>
        <Card className="glass">
          <CardHeader>
            <CardTitle>Couldn&apos;t load {ticker}</CardTitle>
            <CardDescription>
              Yahoo Finance returned no data — usually because the ticker is invalid or because Yahoo is rate-limiting this IP.
              Try again in a few minutes, or run a snapshot from the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const settings = await getSettings();
  const v = computeValuations(f, settings);
  const change52WHigh =
    f.price && f.fiftyTwoWeekHigh ? (f.price - f.fiftyTwoWeekHigh) / f.fiftyTwoWeekHigh : null;
  const change52WLow =
    f.price && f.fiftyTwoWeekLow ? (f.price - f.fiftyTwoWeekLow) / f.fiftyTwoWeekLow : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
        </Button>
        <WatchlistToggle ticker={ticker} />
      </div>

      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default">{f.exchange}</Badge>
            <span className="text-xs text-muted-foreground">{f.currency}</span>
          </div>
          <h1 className="mt-2 text-2xl lg:text-3xl font-semibold tracking-tight">
            {f.longName ?? f.shortName ?? ticker}{" "}
            <span className="text-muted-foreground font-medium ml-2">{ticker}</span>
          </h1>
          <div className="text-sm text-muted-foreground">
            {[f.sector, f.industry].filter(Boolean).join(" • ") || "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold">{formatCurrency(f.price, f.currency)}</div>
          <div className="text-xs text-muted-foreground space-x-3">
            <span>52W H: {formatCurrency(f.fiftyTwoWeekHigh, f.currency)}</span>
            <span className={change52WHigh && change52WHigh < 0 ? "text-amber-400" : ""}>
              ({change52WHigh === null ? "—" : formatPercent(change52WHigh)})
            </span>
          </div>
          <div className="text-xs text-muted-foreground space-x-3">
            <span>52W L: {formatCurrency(f.fiftyTwoWeekLow, f.currency)}</span>
            <span className={change52WLow && change52WLow > 0 ? "text-emerald-400" : ""}>
              ({change52WLow === null ? "—" : formatPercent(change52WLow)})
            </span>
          </div>
        </div>
      </header>

      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Price history</CardTitle>
          <CardDescription>Adjusted-close from Yahoo Finance.</CardDescription>
        </CardHeader>
        <CardContent>
          <PriceChart ticker={ticker} currency={f.currency} />
        </CardContent>
      </Card>

      <ValuationCards f={f} v={v} />

      <div className="grid gap-6 lg:grid-cols-2">
        <MoSBar f={f} v={v} />
        <FundamentalsTable f={f} />
      </div>
    </div>
  );
}
