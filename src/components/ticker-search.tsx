"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SearchResult } from "@/lib/yahoo/types";

interface Props {
  placeholder?: string;
}

export function TickerSearch({ placeholder = "Search a ticker…" }: Props) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/yahoo/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results ?? []);
        setOpen(true);
        setActiveIdx(0);
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

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const select = (r: SearchResult) => {
    setOpen(false);
    setQ("");
    router.push(`/stock/${encodeURIComponent(r.symbol)}`);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="pl-9 h-11"
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[activeIdx]) {
              e.preventDefault();
              select(results[activeIdx]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-border/60 bg-popover/95 backdrop-blur-xl shadow-xl ring-1 ring-white/10">
          <ul className="max-h-80 overflow-y-auto scrollbar-thin">
            {results.map((r, i) => (
              <li key={r.symbol}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => select(r)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    i === activeIdx ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{r.symbol}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {r.longname ?? r.shortname ?? ""}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {r.exchDisp ?? r.exchange ?? ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
