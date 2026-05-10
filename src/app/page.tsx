import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TickerSearch } from "@/components/ticker-search";
import { SnapshotPanel } from "@/components/snapshot-panel";
import { ArrowRight, ListFilter, Star, Wallet, TrendingUp, Calculator } from "lucide-react";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 glass p-8 lg:p-12">
        <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="relative">
          <Badge variant="default" className="mb-4">
            ASX • BSE • NSE • US
          </Badge>
          <h1 className="text-balance text-3xl lg:text-5xl font-semibold tracking-tight">
            Look at every stock through{" "}
            <span className="gradient-text">a value-investor&apos;s lens.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base lg:text-lg text-muted-foreground text-balance">
            Graham Number, NCAV, Earnings Power Value, and the Graham Growth formula —
            calculated live from Yahoo Finance, with a margin-of-safety panel that
            colour-codes the answer.
          </p>
          <div className="mt-6 max-w-xl">
            <TickerSearch placeholder="Search a ticker (AAPL, RELIANCE.NS, CBA.AX)…" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Try:</span>
            {["AAPL", "BRK-B", "CBA.AX", "RELIANCE.NS", "INFY.NS", "TCS.BO"].map((t) => (
              <Link
                key={t}
                href={`/stock/${encodeURIComponent(t)}`}
                className="rounded-md border border-border/60 bg-card/40 px-2 py-1 hover:border-primary/40 hover:text-foreground transition-colors"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          icon={<ListFilter className="h-5 w-5" />}
          title="Screener"
          desc="Graham filters across 200 large-caps."
          href="/screener"
        />
        <FeatureCard
          icon={<Star className="h-5 w-5" />}
          title="Watchlist"
          desc="Theses, target buys, stop losses."
          href="/watchlist"
        />
        <FeatureCard
          icon={<Wallet className="h-5 w-5" />}
          title="Portfolio"
          desc="Realised + unrealised, vs benchmark."
          href="/portfolio"
        />
        <FeatureCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Live charts"
          desc="1Y / 5Y price + 52W range."
          href="/stock/AAPL"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" /> Valuation models, demystified
            </CardTitle>
            <CardDescription>
              Hover over any number on a stock page to see the exact formula and inputs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <FormulaRow
              name="Graham Number"
              formula="√(22.5 × EPS × BVPS)"
              note="Conservative ceiling for defensive investors. 22.5 = max P/E (15) × max P/B (1.5)."
            />
            <FormulaRow
              name="NCAV / share"
              formula="(Current Assets − Total Liabilities) / Shares"
              note="Net-net: liquidation-style floor. Buying below this is rare and powerful."
            />
            <FormulaRow
              name="EPV / share"
              formula="(EBITDA × (1 − tax)) / WACC / Shares"
              note="Greenwald-style steady-state value. Tax 25%, WACC 9%. Ignores growth."
            />
            <FormulaRow
              name="Graham Growth"
              formula="EPS × (8.5 + 2g) × 4.4 / Y"
              note="Revised 1962. g capped at 15%, AAA proxy yield 4.5%."
            />
          </CardContent>
        </Card>
        <SnapshotPanel />
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className="glass h-full transition-all hover:border-primary/40 hover:translate-y-[-1px]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              {icon}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{desc}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function FormulaRow({ name, formula, note }: { name: string; formula: string; note: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium">{name}</div>
        <code className="font-mono text-xs text-primary">{formula}</code>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}
