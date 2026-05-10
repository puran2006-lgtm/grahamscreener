import { PortfolioView } from "@/components/portfolio/portfolio-view";

export const dynamic = "force-dynamic";

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Log buys and sells. Realized + unrealized P&amp;L are computed live, with a benchmark
          comparison against ASX 200, SENSEX, NIFTY 50, or S&amp;P 500.
        </p>
      </header>
      <PortfolioView />
    </div>
  );
}
