import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "About — GrahamScreener",
  description: "About GrahamScreener — a Graham-discipline value screener for ASX, BSE, NSE, and US equities.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">About GrahamScreener</h1>
        <p className="mt-2 text-muted-foreground">
          Graham-discipline value screener for ASX, BSE, NSE, and US equities.
        </p>
      </header>

      <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          GrahamScreener applies Benjamin Graham&apos;s time-tested valuation
          frameworks — Graham Number, NCAV, EPV, and Growth Formula — to 200+
          large-cap equities across four major exchanges. All data is sourced
          live from Yahoo Finance at zero cost.
        </p>
        <p>
          The screener is designed for individual investors who want
          institutional-grade fundamental analysis without the price tag. Set
          price alerts, track a watchlist with thesis notes, manage a portfolio
          with FIFO cost-basis tracking, and screen for undervalued stocks using
          Graham&apos;s criteria from <em>The Intelligent Investor</em> and{" "}
          <em>Security Analysis</em>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">From the founder</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          I built GrahamScreener because I wanted a single tool that applied
          Graham&apos;s valuation discipline across every market I invest in —
          without paying for expensive data subscriptions or juggling
          spreadsheets. It&apos;s open-source, free to use, and designed to be
          self-hosted or run on Vercel&apos;s free tier. If it helps you make
          better investment decisions, that&apos;s the whole point.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Contact</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="mailto:hello@grahamscreener.com"
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3 text-sm transition-colors hover:bg-accent"
          >
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">General</div>
              <div className="text-xs text-muted-foreground">hello@grahamscreener.com</div>
            </div>
          </a>
          <a
            href="mailto:partnerships@grahamscreener.com"
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3 text-sm transition-colors hover:bg-accent"
          >
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Partnerships</div>
              <div className="text-xs text-muted-foreground">partnerships@grahamscreener.com</div>
            </div>
          </a>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Open source</h2>
        <p className="text-sm text-muted-foreground">
          GrahamScreener is MIT-licensed and open source. Contributions, issues,
          and stars are welcome.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://github.com/puran2006-lgtm/grahamscreener"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" />
            View on GitHub
          </a>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Documentation
          </Link>
        </div>
      </section>
    </div>
  );
}
