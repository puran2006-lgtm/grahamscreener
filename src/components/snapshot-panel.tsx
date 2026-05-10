"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Loader2, Play, RefreshCw, Star } from "lucide-react";

interface SnapshotInfo {
  count: number;
  lastFetchedAt: number | null;
}

export function SnapshotPanel() {
  const [info, setInfo] = React.useState<SnapshotInfo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [last, setLast] = React.useState<{ success: number; failed: number } | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/snapshot");
      const d = (await r.json()) as SnapshotInfo;
      setInfo(d);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (watchlistOnly: boolean) => {
    setRunning(true);
    setLast(null);
    try {
      const r = await fetch("/api/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchlistOnly }),
      });
      const d = (await r.json()) as { success: number; failed: number };
      setLast(d);
      await refresh();
    } finally {
      setRunning(false);
    }
  };

  const seed = async () => {
    await fetch("/api/seed", { method: "POST" });
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" /> Snapshot cache
        </CardTitle>
        <CardDescription>
          Cache fundamentals to local SQLite. Snapshot the watchlist daily, or the
          full universe weekly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-card/30 p-3">
          <div className="text-sm">
            <div className="font-medium">{info?.count ?? "—"} tickers cached</div>
            <div className="text-xs text-muted-foreground">
              {info?.lastFetchedAt
                ? `Last refresh ${new Date(info.lastFetchedAt).toLocaleString()}`
                : "Never refreshed."}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={() => run(true)} disabled={running} variant="default">
            {running ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Snapshot watchlist
          </Button>
          <Button onClick={() => run(false)} disabled={running} variant="outline">
            {running ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Snapshot full universe
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={seed} className="w-full">
          <Star className="h-4 w-4 mr-2" /> Load 5 sample watchlist items
        </Button>

        {last && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="success">{last.success} ok</Badge>
            {last.failed > 0 && <Badge variant="destructive">{last.failed} failed</Badge>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
