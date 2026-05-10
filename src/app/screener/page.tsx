import { Suspense } from "react";
import { ScreenerView } from "@/components/screener/screener-view";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function ScreenerPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Screener</h1>
        <p className="text-sm text-muted-foreground">
          Apply Graham-style filters to a 50-ticker liquid large-cap universe per exchange.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ScreenerView />
      </Suspense>
    </div>
  );
}
