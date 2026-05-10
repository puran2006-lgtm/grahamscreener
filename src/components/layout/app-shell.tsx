"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Star,
  ListFilter,
  Wallet,
  Bell,
  Sparkles,
  Search,
  CommandIcon,
  HeartPulse,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/layout/command-palette";
import { SettingsDrawer } from "@/components/settings/settings-drawer";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, key: "g d" },
  { href: "/screener", label: "Screener", icon: ListFilter, key: "g s" },
  { href: "/watchlist", label: "Watchlist", icon: Star, key: "g w" },
  { href: "/portfolio", label: "Portfolio", icon: Wallet, key: "g p" },
  { href: "/alerts", label: "Alerts", icon: Bell, key: "g a" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
    };
    let lastG = 0;
    const onSeq = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const now = Date.now();
      if (e.key.toLowerCase() === "g") {
        lastG = now;
        return;
      }
      if (now - lastG < 700) {
        const k = e.key.toLowerCase();
        const map: Record<string, string> = { d: "/", s: "/screener", w: "/watchlist", p: "/portfolio", a: "/alerts" };
        if (map[k]) {
          e.preventDefault();
          router.push(map[k]);
          lastG = 0;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keydown", onSeq);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onSeq);
    };
  }, [router]);

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-border/50 px-4 py-6 sticky top-0 h-screen">
        <Link href="/" className="flex items-center gap-2 px-2 mb-8">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary via-primary to-emerald-500 text-primary-foreground shadow ring-1 ring-white/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">GrahamScreener</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Graham-discipline screener
            </div>
          </div>
        </Link>

        <Button
          variant="outline"
          className="w-full justify-between mb-6 text-muted-foreground hover:text-foreground"
          onClick={() => setPaletteOpen(true)}
        >
          <span className="inline-flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="text-xs">Search ticker, jump to…</span>
          </span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/60 bg-muted/50 px-1.5 font-mono text-[10px] font-medium opacity-100">
            <CommandIcon className="h-3 w-3" />K
          </kbd>
        </Button>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  Active
                    ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", Active ? "text-primary" : "")} />
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] tracking-widest text-muted-foreground/60 group-hover:text-muted-foreground">
                  {item.key}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2">
          <Link
            href="/docs"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors",
              pathname.startsWith("/docs")
                ? "text-foreground bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Docs
          </Link>
          <Link
            href="/health"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors",
              pathname === "/health"
                ? "text-foreground bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <HeartPulse className="h-3.5 w-3.5" />
            System Health
          </Link>
          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 backdrop-blur p-3 text-xs text-muted-foreground">
            <span>Data: Yahoo Finance (free)</span>
            <div className="flex items-center gap-1">
              <SettingsDrawer />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border/50 bg-background/80 backdrop-blur px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-primary via-primary to-emerald-500 text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">GrahamScreener</span>
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setPaletteOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          {children}
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden sticky bottom-0 z-30 grid grid-cols-5 gap-1 border-t border-border/50 bg-background/90 backdrop-blur px-2 py-2">
          {NAV.map((item) => {
            const Active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px]",
                  Active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
