"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Settings, RotateCcw, Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types (mirrors server-side ValuationSettings)                      */
/* ------------------------------------------------------------------ */

interface ValuationSettings {
  wacc: number;
  taxRate: number;
  aaaYield: number;
  baseMultiplier: number;
  growthCap: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SettingsDrawer() {
  const [open, setOpen] = React.useState(false);
  const [settings, setSettings] = React.useState<ValuationSettings | null>(null);
  const [defaults, setDefaults] = React.useState<ValuationSettings | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  // Fetch current settings when drawer opens
  React.useEffect(() => {
    if (!open) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: { settings: ValuationSettings; defaults: ValuationSettings }) => {
        setSettings(d.settings);
        setDefaults(d.defaults);
      });
  }, [open]);

  const save = async () => {
    if (!settings) return;
    setBusy(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  const resetDefaults = () => {
    if (defaults) setSettings({ ...defaults });
  };

  const update = (key: keyof ValuationSettings, raw: string) => {
    if (!settings) return;
    const n = Number(raw);
    if (isNaN(n)) return;
    setSettings({ ...settings, [key]: n });
  };

  return (
    <>
      {/* Trigger button — rendered wherever parent places it */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        title="Valuation settings"
      >
        <Settings className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Valuation Settings</DialogTitle>
            <DialogDescription>
              Adjust the constants used in EPV and Graham Growth formulas.
              Changes apply to all stock pages and the screener.
            </DialogDescription>
          </DialogHeader>

          {settings === null ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="space-y-5 pt-2">
              {/* EPV section */}
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  EPV (Greenwald)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <SettingsField
                    label="WACC (discount rate)"
                    value={settings.wacc}
                    onChange={(v) => update("wacc", v)}
                    suffix="%"
                    display={(v) => `${(v * 100).toFixed(1)}%`}
                    hint="e.g. 0.09 = 9%"
                  />
                  <SettingsField
                    label="Tax rate"
                    value={settings.taxRate}
                    onChange={(v) => update("taxRate", v)}
                    suffix="%"
                    display={(v) => `${(v * 100).toFixed(0)}%`}
                    hint="e.g. 0.25 = 25%"
                  />
                </div>
              </div>

              {/* Graham Growth section */}
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Graham Growth Formula
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <SettingsField
                    label="AAA bond yield (Y)"
                    value={settings.aaaYield}
                    onChange={(v) => update("aaaYield", v)}
                    suffix="%"
                    display={(v) => `${v}%`}
                    hint="As percentage, e.g. 4.5"
                  />
                  <SettingsField
                    label="Base multiplier"
                    value={settings.baseMultiplier}
                    onChange={(v) => update("baseMultiplier", v)}
                    display={(v) => `${v}`}
                    hint="No-growth P/E (default 8.5)"
                  />
                </div>
                <SettingsField
                  label="Growth cap (max g%)"
                  value={settings.growthCap}
                  onChange={(v) => update("growthCap", v)}
                  suffix="%"
                  display={(v) => `${v}%`}
                  hint="Maximum growth rate allowed"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/30">
                <Button variant="ghost" size="sm" onClick={resetDefaults}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset to defaults
                </Button>
                <div className="flex items-center gap-2">
                  {saved && (
                    <span className="text-xs text-emerald-400">Saved</span>
                  )}
                  <Button onClick={save} disabled={busy} size="sm">
                    {busy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Individual settings field                                          */
/* ------------------------------------------------------------------ */

function SettingsField({
  label,
  value,
  onChange,
  display,
  hint,
}: {
  label: string;
  value: number;
  onChange: (raw: string) => void;
  suffix?: string;
  display: (v: number) => string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          className="h-8 text-xs font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[40px]">
          {display(value)}
        </span>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
