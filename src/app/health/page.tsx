"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Database, Activity, HardDrive, Clock } from "lucide-react";

interface HealthData {
  status: string;
  timestamp: number;
  database: {
    path: string;
    sizeBytes: number;
    sizeHuman: string;
    tables: {
      watchlist: number;
      portfolio_trades: number;
      snapshot_cache: number;
    };
  };
  cache: {
    totalCached: number;
    freshForStockPage: number;
    freshForScreener: number;
    stale: number;
    hitRateEstimate: string;
  };
  snapshotsByExchange: Record<string, { count: number; oldestAt: number; newestAt: number }>;
  yahooSession: {
    note: string;
    ttlMinutes: number;
  };
}

function timeAgo(ms: number): string {
  if (!ms || ms === Infinity) return "never";
  const diff = Date.now() - ms;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function HealthPage() {
  const [data, setData] = React.useState<HealthData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchHealth();
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">System Health</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">System Health</h1>
        <p className="text-muted-foreground">Failed to load health data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System Health</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Database, cache, and data source status
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Status"
          value={data.status.toUpperCase()}
          badge="green"
        />
        <StatCard
          icon={<HardDrive className="h-5 w-5" />}
          label="DB Size"
          value={data.database.sizeHuman}
        />
        <StatCard
          icon={<Database className="h-5 w-5" />}
          label="Cached Tickers"
          value={`${data.cache.totalCached} / 200`}
          sub={data.cache.hitRateEstimate}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Yahoo Session"
          value={`${data.yahooSession.ttlMinutes}m TTL`}
          sub="Auto-refreshes on error"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Database Tables</CardTitle>
            <CardDescription>Row counts for each table</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Table</th>
                  <th className="py-2 text-right">Rows</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/30">
                  <td className="py-2">watchlist</td>
                  <td className="py-2 text-right font-mono">{data.database.tables.watchlist}</td>
                </tr>
                <tr className="border-t border-border/30">
                  <td className="py-2">portfolio_trades</td>
                  <td className="py-2 text-right font-mono">{data.database.tables.portfolio_trades}</td>
                </tr>
                <tr className="border-t border-border/30">
                  <td className="py-2">snapshot_cache</td>
                  <td className="py-2 text-right font-mono">{data.database.tables.snapshot_cache}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Cache Freshness</CardTitle>
            <CardDescription>How many cached tickers are within TTL</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Metric</th>
                  <th className="py-2 text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/30">
                  <td className="py-2">Fresh for stock page (&lt;6h)</td>
                  <td className="py-2 text-right font-mono">{data.cache.freshForStockPage}</td>
                </tr>
                <tr className="border-t border-border/30">
                  <td className="py-2">Fresh for screener (&lt;24h)</td>
                  <td className="py-2 text-right font-mono">{data.cache.freshForScreener}</td>
                </tr>
                <tr className="border-t border-border/30">
                  <td className="py-2">Stale (&gt;24h)</td>
                  <td className="py-2 text-right font-mono">{data.cache.stale}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {Object.keys(data.snapshotsByExchange).length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Snapshot Status by Exchange</CardTitle>
            <CardDescription>Last snapshot times per exchange</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Exchange</th>
                  <th className="py-2 text-right">Tickers</th>
                  <th className="py-2 text-right">Oldest</th>
                  <th className="py-2 text-right">Newest</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.snapshotsByExchange).map(([ex, info]) => (
                  <tr key={ex} className="border-t border-border/30">
                    <td className="py-2 font-medium">{ex}</td>
                    <td className="py-2 text-right font-mono">{info.count}</td>
                    <td className="py-2 text-right text-muted-foreground">{timeAgo(info.oldestAt)}</td>
                    <td className="py-2 text-right text-muted-foreground">{timeAgo(info.newestAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  badge?: "green" | "yellow" | "red";
}) {
  return (
    <Card className="glass">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            {icon}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{value}</span>
              {badge === "green" && (
                <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  Healthy
                </Badge>
              )}
            </div>
            {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
