"use client";

import * as React from "react";
import {
  Bell,
  Plus,
  Pause,
  Play,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty/empty-state";
import { AlertModal } from "@/components/alerts/alert-modal";

interface AlertItem {
  id: number;
  userEmail: string;
  ticker: string;
  exchange: string;
  conditionType: "target_buy" | "stop_loss" | "pct_change_up" | "pct_change_down";
  threshold: number;
  active: number;
  lastFiredAt: number | null;
  lastCheckedAt: number | null;
  referencePrice: number | null;
  createdAt: number;
  notes: string | null;
}

const CONDITION_LABELS: Record<string, string> = {
  target_buy: "Target Buy",
  stop_loss: "Stop Loss",
  pct_change_up: "% Up",
  pct_change_down: "% Down",
};

const CONDITION_COLORS: Record<string, string> = {
  target_buy: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  stop_loss: "bg-red-500/10 text-red-500 border-red-500/20",
  pct_change_up: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  pct_change_down: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

function formatThreshold(type: string, threshold: number): string {
  if (type === "pct_change_up" || type === "pct_change_down") {
    return `${threshold}%`;
  }
  return `$${threshold.toFixed(2)}`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function AlertsView() {
  const [items, setItems] = React.useState<AlertItem[] | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AlertItem | null>(null);
  const [pausedOpen, setPausedOpen] = React.useState(false);
  const [firedOpen, setFiredOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch("/api/alerts", { cache: "no-store" });
    const d = (await r.json()) as { items: AlertItem[] };
    setItems(d.items);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (alert: AlertItem) => {
    setActionLoading(alert.id);
    await fetch(`/api/alerts/${alert.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: alert.active ? 0 : 1 }),
    });
    await load();
    setActionLoading(null);
  };

  const remove = async (id: number) => {
    setActionLoading(id);
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    await load();
    setActionLoading(null);
  };

  const openEdit = (alert: AlertItem) => {
    setEditing(alert);
    setModalOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const onSaved = () => {
    setModalOpen(false);
    setEditing(null);
    load();
  };

  if (items === null) {
    return (
      <Card className="glass">
        <CardContent className="pt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const active = items.filter((a) => a.active === 1 && !a.lastFiredAt);
  const paused = items.filter((a) => a.active === 0);
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentlyFired = items.filter(
    (a) => a.lastFiredAt && a.lastFiredAt > thirtyDaysAgo
  );
  // Active alerts that have fired but are still active
  const activeFired = items.filter((a) => a.active === 1 && a.lastFiredAt);

  const allActive = [...active, ...activeFired];

  return (
    <>
      {/* Active Alerts */}
      <Card className="glass">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Active Alerts</CardTitle>
            <Badge variant="outline" className="ml-1">{allActive.length}</Badge>
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            New Alert
          </Button>
        </CardHeader>
        <CardContent>
          {allActive.length === 0 ? (
            <EmptyState
              illustration="default"
              title="No active alerts"
              description="Set up a price alert to get emailed when a stock hits your target."
              ctaLabel="Create Alert"
              onCta={openNew}
            />
          ) : (
            <AlertTable
              alerts={allActive}
              actionLoading={actionLoading}
              onToggle={toggleActive}
              onEdit={openEdit}
              onDelete={remove}
            />
          )}
        </CardContent>
      </Card>

      {/* Paused Alerts */}
      {paused.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setPausedOpen(!pausedOpen)}
            >
              {pausedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Paused Alerts
              <Badge variant="outline">{paused.length}</Badge>
            </button>
          </CardHeader>
          {pausedOpen && (
            <CardContent>
              <AlertTable
                alerts={paused}
                actionLoading={actionLoading}
                onToggle={toggleActive}
                onEdit={openEdit}
                onDelete={remove}
              />
            </CardContent>
          )}
        </Card>
      )}

      {/* Recently Triggered */}
      {recentlyFired.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setFiredOpen(!firedOpen)}
            >
              {firedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Recently Triggered (30 days)
              <Badge variant="outline">{recentlyFired.length}</Badge>
            </button>
          </CardHeader>
          {firedOpen && (
            <CardContent>
              <AlertTable
                alerts={recentlyFired}
                actionLoading={actionLoading}
                onToggle={toggleActive}
                onEdit={openEdit}
                onDelete={remove}
              />
            </CardContent>
          )}
        </Card>
      )}

      <AlertModal
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        onSaved={onSaved}
        defaultEmail={items.find((a) => a.userEmail)?.userEmail ?? ""}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Alert Table                                                        */
/* ------------------------------------------------------------------ */

function AlertTable({
  alerts,
  actionLoading,
  onToggle,
  onEdit,
  onDelete,
}: {
  alerts: AlertItem[];
  actionLoading: number | null;
  onToggle: (a: AlertItem) => void;
  onEdit: (a: AlertItem) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="overflow-x-auto scrollbar-thin -mx-2">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="px-2 py-2">Ticker</th>
            <th className="px-2 py-2">Condition</th>
            <th className="px-2 py-2 text-right">Threshold</th>
            <th className="px-2 py-2 text-right">Ref Price</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Last Fired</th>
            <th className="px-2 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr
              key={a.id}
              className="border-t border-border/30 hover:bg-accent/30 transition-colors"
            >
              <td className="px-2 py-2 font-medium">{a.ticker}</td>
              <td className="px-2 py-2">
                <Badge
                  variant="outline"
                  className={CONDITION_COLORS[a.conditionType] ?? ""}
                >
                  {CONDITION_LABELS[a.conditionType] ?? a.conditionType}
                </Badge>
              </td>
              <td className="px-2 py-2 text-right font-mono">
                {formatThreshold(a.conditionType, a.threshold)}
              </td>
              <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                {a.referencePrice ? `$${a.referencePrice.toFixed(2)}` : "—"}
              </td>
              <td className="px-2 py-2">
                <Badge variant={a.active ? "default" : "secondary"}>
                  {a.active ? "Active" : "Paused"}
                </Badge>
              </td>
              <td className="px-2 py-2 text-muted-foreground text-xs">
                {a.lastFiredAt ? timeAgo(a.lastFiredAt) : "Never"}
              </td>
              <td className="px-2 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onToggle(a)}
                    disabled={actionLoading === a.id}
                    title={a.active ? "Pause" : "Resume"}
                  >
                    {actionLoading === a.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : a.active ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(a)}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(a.id)}
                    disabled={actionLoading === a.id}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
