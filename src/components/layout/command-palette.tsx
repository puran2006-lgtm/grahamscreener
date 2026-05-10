"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, TrendingUp, LayoutDashboard, ListFilter, Star, Wallet } from "lucide-react";
import type { SearchResult } from "@/lib/yahoo/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
    }
  }, [open]);

  React.useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/yahoo/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { results: SearchResult[] };
          setResults(data.results ?? []);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  const go = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search any ticker (AAPL, RELIANCE.NS, CBA.AX) or jump to a page…"
        value={q}
        onValueChange={setQ}
      />
      <CommandList className="scrollbar-thin">
        {!q && (
          <CommandGroup heading="Pages">
            <CommandItem onSelect={() => go("/")}>
              <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
            </CommandItem>
            <CommandItem onSelect={() => go("/screener")}>
              <ListFilter className="mr-2 h-4 w-4" /> Screener
            </CommandItem>
            <CommandItem onSelect={() => go("/watchlist")}>
              <Star className="mr-2 h-4 w-4" /> Watchlist
            </CommandItem>
            <CommandItem onSelect={() => go("/portfolio")}>
              <Wallet className="mr-2 h-4 w-4" /> Portfolio
            </CommandItem>
          </CommandGroup>
        )}
        {q && (
          <CommandEmpty>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching Yahoo Finance…
              </span>
            ) : (
              "No tickers found"
            )}
          </CommandEmpty>
        )}
        {results.length > 0 && (
          <CommandGroup heading="Tickers">
            {results.map((r) => (
              <CommandItem
                key={r.symbol}
                onSelect={() => go(`/stock/${encodeURIComponent(r.symbol)}`)}
                value={`${r.symbol} ${r.shortname ?? ""} ${r.longname ?? ""}`}
              >
                <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">
                    {r.symbol}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {r.shortname ?? r.longname ?? ""}
                    </span>
                  </div>
                </div>
                <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {r.exchDisp ?? r.exchange ?? ""}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
