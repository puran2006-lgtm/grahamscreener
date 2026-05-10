"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, AlertCircle, CheckCircle } from "lucide-react";
import {
  parseCsvText,
  parseWithMapping,

  brokerDisplayName,
  type CsvTrade,
  type BrokerFormat,
  type ColumnMapping,
} from "@/lib/csv";
import { formatNumber } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after successful import so parent can reload trades. */
  onImported: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CsvImportModal({ open, onOpenChange, onImported }: CsvImportModalProps) {
  const [step, setStep] = React.useState<"upload" | "mapping" | "preview" | "done">("upload");
  const [broker, setBroker] = React.useState<BrokerFormat>("unknown");
  const [trades, setTrades] = React.useState<CsvTrade[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [importedCount, setImportedCount] = React.useState(0);

  // For manual column mapping (unknown broker)
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rawRows, setRawRows] = React.useState<string[][]>([]);
  const [mapping, setMapping] = React.useState<ColumnMapping>({
    ticker: "",
    side: "",
    quantity: "",
    price: "",
    fees: "",
    date: "",
    notes: "",
  });

  const fileRef = React.useRef<HTMLInputElement>(null);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setStep("upload");
      setBroker("unknown");
      setTrades([]);
      setErrors([]);
      setBusy(false);
      setImportedCount(0);
      setHeaders([]);
      setRawRows([]);
      setMapping({ ticker: "", side: "", quantity: "", price: "", fees: "", date: "", notes: "" });
    }
  }, [open]);

  /* ---- File selection ---- */
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCsvText(text);
      setBroker(result.broker);
      setErrors(result.errors);

      if (result.broker === "unknown") {
        // Show manual mapping step
        setHeaders(result.headers);
        setRawRows(result.rawRows);
        setStep("mapping");
      } else {
        setTrades(result.trades);
        setStep("preview");
      }
    };
    reader.readAsText(file);
  };

  /* ---- Manual mapping confirm ---- */
  const applyMapping = () => {
    if (!mapping.ticker || !mapping.quantity || !mapping.price) return;
    const result = parseWithMapping(rawRows, headers, mapping);
    setTrades(result.trades);
    setErrors(result.errors);
    setStep("preview");
  };

  /* ---- Import confirmed ---- */
  const confirmImport = async () => {
    if (trades.length === 0) return;
    setBusy(true);
    try {
      const resp = await fetch("/api/portfolio/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as { inserted: number };
        setImportedCount(data.inserted);
        setStep("done");
        onImported();
      } else {
        const data = await resp.json();
        setErrors([`Import failed: ${JSON.stringify(data.error)}`]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Trades from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV from GrahamScreener, Stake, CommSec, Interactive Brokers, or Zerodha.
            Unknown formats get a column-mapping step.
          </DialogDescription>
        </DialogHeader>

        {/* ---- STEP: Upload ---- */}
        {step === "upload" && (
          <div className="space-y-4 pt-2">
            <div
              className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Click to select a CSV file, or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports: GrahamScreener, Stake, CommSec, Interactive Brokers, Zerodha
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFile}
            />
            <div className="text-xs text-muted-foreground">
              Need a template?{" "}
              <a href="/sample-template.csv" download className="text-primary hover:underline">
                Download sample CSV
              </a>
            </div>
          </div>
        )}

        {/* ---- STEP: Manual Column Mapping ---- */}
        {step === "mapping" && (
          <div className="space-y-4 pt-2">
            <div className="text-sm text-muted-foreground">
              Could not auto-detect the broker format. Please map the columns below.
            </div>
            <div className="text-xs text-muted-foreground">
              Detected headers: <span className="font-mono">{headers.join(", ")}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["ticker", "Ticker column", true],
                  ["side", "Side (BUY/SELL)", false],
                  ["quantity", "Quantity column", true],
                  ["price", "Price column", true],
                  ["fees", "Fees column", false],
                  ["date", "Date column", false],
                  ["notes", "Notes column", false],
                ] as const
              ).map(([key, label, required]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">
                    {label} {required && <span className="text-rose-400">*</span>}
                  </Label>
                  <Select
                    value={mapping[key] || "__none__"}
                    onValueChange={(v) =>
                      setMapping({ ...mapping, [key]: v === "__none__" ? "" : v })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button
                onClick={applyMapping}
                disabled={!mapping.ticker || !mapping.quantity || !mapping.price}
              >
                Preview import
              </Button>
            </div>
          </div>
        )}

        {/* ---- STEP: Preview ---- */}
        {step === "preview" && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{brokerDisplayName(broker)}</Badge>
              <span className="text-muted-foreground">
                {trades.length} trade{trades.length !== 1 ? "s" : ""} parsed
              </span>
            </div>

            {errors.length > 0 && (
              <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-rose-300 space-y-0.5">
                    {errors.slice(0, 10).map((e, i) => (
                      <div key={i}>{e}</div>
                    ))}
                    {errors.length > 10 && (
                      <div>...and {errors.length - 10} more errors</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {trades.length > 0 && (
              <div className="overflow-x-auto max-h-64 overflow-y-auto border border-border/30 rounded-md">
                <table className="w-full text-xs min-w-[600px]">
                  <thead className="sticky top-0 bg-background">
                    <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">Ticker</th>
                      <th className="px-2 py-2">Side</th>
                      <th className="px-2 py-2 text-right">Qty</th>
                      <th className="px-2 py-2 text-right">Price</th>
                      <th className="px-2 py-2 text-right">Fees</th>
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.slice(0, 50).map((t, i) => (
                      <tr key={i} className="border-t border-border/20">
                        <td className="px-3 py-1.5 font-mono font-medium">{t.ticker}</td>
                        <td className="px-2 py-1.5">
                          <Badge variant={t.side === "BUY" ? "success" : "warning"} className="text-[10px]">
                            {t.side}
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">{formatNumber(t.quantity, 4)}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{formatNumber(t.price, 2)}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{formatNumber(t.fees, 2)}</td>
                        <td className="px-2 py-1.5">{new Date(t.tradeDate).toLocaleDateString()}</td>
                        <td className="px-2 py-1.5 text-muted-foreground max-w-[160px] truncate">
                          {t.notes}
                        </td>
                      </tr>
                    ))}
                    {trades.length > 50 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-2 text-center text-muted-foreground">
                          ...and {trades.length - 50} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={confirmImport} disabled={busy || trades.length === 0}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Import ({trades.length} trades)
              </Button>
            </div>
          </div>
        )}

        {/* ---- STEP: Done ---- */}
        {step === "done" && (
          <div className="space-y-4 pt-2 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-400" />
            <div className="text-lg font-medium">
              {importedCount} trade{importedCount !== 1 ? "s" : ""} imported
            </div>
            <div className="text-sm text-muted-foreground">
              Your portfolio has been updated. FIFO cost basis will be recalculated automatically.
            </div>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
