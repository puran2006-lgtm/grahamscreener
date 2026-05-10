"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TickerSearch } from "@/components/ticker-search";

type ConditionType = "target_buy" | "stop_loss" | "pct_change_up" | "pct_change_down";

interface AlertItem {
  id: number;
  userEmail: string;
  ticker: string;
  exchange: string;
  conditionType: ConditionType;
  threshold: number;
  active: number;
  lastFiredAt: number | null;
  lastCheckedAt: number | null;
  referencePrice: number | null;
  createdAt: number;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AlertItem | null;
  onSaved: () => void;
  defaultEmail: string;
}

const CONDITION_OPTIONS: Array<{ value: ConditionType; label: string; hint: string }> = [
  { value: "target_buy", label: "Target Buy Price", hint: "Alert when price drops to or below this level" },
  { value: "stop_loss", label: "Stop Loss", hint: "Alert when price drops to or below this level" },
  { value: "pct_change_up", label: "% Change Up", hint: "Alert when price rises by this percentage from reference" },
  { value: "pct_change_down", label: "% Change Down", hint: "Alert when price drops by this percentage from reference" },
];

export function AlertModal({ open, onOpenChange, editing, onSaved, defaultEmail }: Props) {
  const [ticker, setTicker] = React.useState("");
  const [conditionType, setConditionType] = React.useState<ConditionType>("target_buy");
  const [threshold, setThreshold] = React.useState("");
  const [referencePrice, setReferencePrice] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Populate form when editing or opening fresh
  React.useEffect(() => {
    if (editing) {
      setTicker(editing.ticker);
      setConditionType(editing.conditionType);
      setThreshold(String(editing.threshold));
      setReferencePrice(editing.referencePrice ? String(editing.referencePrice) : "");
      setEmail(editing.userEmail);
      setNotes(editing.notes ?? "");
    } else {
      setTicker("");
      setConditionType("target_buy");
      setThreshold("");
      setReferencePrice("");
      setEmail(defaultEmail);
      setNotes("");
    }
    setError(null);
  }, [editing, open, defaultEmail]);

  const isPctType = conditionType === "pct_change_up" || conditionType === "pct_change_down";
  const selectedHint = CONDITION_OPTIONS.find((o) => o.value === conditionType)?.hint ?? "";

  const save = async () => {
    setError(null);

    // Basic validation
    if (!ticker.trim()) {
      setError("Ticker is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Valid email is required");
      return;
    }
    const thresholdNum = parseFloat(threshold);
    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      setError("Threshold must be a positive number");
      return;
    }
    if (isPctType) {
      const refNum = parseFloat(referencePrice);
      if (isNaN(refNum) || refNum <= 0) {
        setError("Reference price is required for percentage alerts");
        return;
      }
    }

    setSaving(true);
    try {
      if (editing) {
        // PATCH
        const res = await fetch(`/api/alerts/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conditionType,
            threshold: thresholdNum,
            referencePrice: isPctType ? parseFloat(referencePrice) : null,
            userEmail: email,
            notes: notes || null,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? "Update failed");
        }
      } else {
        // POST
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker: ticker.toUpperCase(),
            conditionType,
            threshold: thresholdNum,
            referencePrice: isPctType ? parseFloat(referencePrice) : null,
            userEmail: email,
            notes: notes || null,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? "Create failed");
        }
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Alert" : "New Price Alert"}</DialogTitle>
          <DialogDescription>
            {editing
              ? `Update the alert for ${editing.ticker}.`
              : "Get emailed when a stock hits your price target."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Ticker */}
          <div className="space-y-1.5">
            <Label>Ticker</Label>
            {editing ? (
              <Input value={ticker} disabled />
            ) : (
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL, CBA.AX, RELIANCE.BO…"
              />
            )}
          </div>

          {/* Condition Type */}
          <div className="space-y-1.5">
            <Label>Condition</Label>
            <Select value={conditionType} onValueChange={(v) => setConditionType(v as ConditionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{selectedHint}</p>
          </div>

          {/* Threshold */}
          <div className="space-y-1.5">
            <Label>{isPctType ? "Percentage (%)" : "Price ($)"}</Label>
            <Input
              type="number"
              step={isPctType ? "0.5" : "0.01"}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={isPctType ? "e.g. 10 = 10%" : "e.g. 165.00"}
            />
          </div>

          {/* Reference Price (only for pct types) */}
          {isPctType && (
            <div className="space-y-1.5">
              <Label>Reference Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={referencePrice}
                onChange={(e) => setReferencePrice(e.target.value)}
                placeholder="Price at time of alert creation"
              />
              <p className="text-xs text-muted-foreground">
                The baseline price the percentage is calculated against.
              </p>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why this alert matters…"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button className="w-full" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? "Update Alert" : "Create Alert"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
