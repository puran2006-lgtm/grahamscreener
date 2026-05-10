import { WatchlistView } from "@/components/watchlist/watchlist-view";

export const dynamic = "force-dynamic";

export default function WatchlistPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
        <p className="text-sm text-muted-foreground">
          Stocks you&apos;re tracking, with thesis, target buy, stop-loss, and intended size.
        </p>
      </header>
      <WatchlistView />
    </div>
  );
}
