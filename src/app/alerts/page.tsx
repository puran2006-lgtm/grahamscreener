import { Suspense } from "react";
import { AlertsView } from "@/components/alerts/alerts-view";

export const metadata = {
  title: "Price Alerts — GrahamScreener",
  description: "Set price alerts for target buy, stop loss, and percentage change triggers.",
};

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Price Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Get emailed when a stock hits your target price, stop loss, or moves by a percentage.
        </p>
      </div>
      <Suspense>
        <AlertsView />
      </Suspense>
    </div>
  );
}
