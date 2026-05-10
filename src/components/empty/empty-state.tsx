import * as React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Props {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
  illustration?: "watchlist" | "portfolio" | "screener" | "default";
}

export function EmptyState({ title, description, ctaLabel, ctaHref, onCta, illustration = "default" }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-10 text-center">
      <div className="mx-auto h-32 w-32">
        <Illustration kind={illustration} />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
      {(ctaLabel && (ctaHref || onCta)) && (
        <div className="mt-5">
          {ctaHref ? (
            <Button asChild>
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          ) : (
            <Button onClick={onCta}>{ctaLabel}</Button>
          )}
        </div>
      )}
    </div>
  );
}

function Illustration({ kind }: { kind: "watchlist" | "portfolio" | "screener" | "default" }) {
  const stroke = "hsl(var(--primary))";
  const fill = "hsl(var(--primary) / 0.1)";
  switch (kind) {
    case "watchlist":
      return (
        <svg viewBox="0 0 128 128" fill="none" stroke={stroke} strokeWidth={2}>
          <circle cx="64" cy="64" r="56" stroke="hsl(var(--border))" />
          <path d="M64 36 L72 56 L94 58 L77 72 L82 94 L64 82 L46 94 L51 72 L34 58 L56 56 Z" fill={fill} />
          <path d="M22 100 L40 88 L58 96 L80 78 L106 90" stroke={stroke} strokeWidth={1.5} fill="none" />
        </svg>
      );
    case "portfolio":
      return (
        <svg viewBox="0 0 128 128" fill="none" stroke={stroke} strokeWidth={2}>
          <rect x="16" y="40" width="96" height="64" rx="6" stroke="hsl(var(--border))" fill={fill} />
          <rect x="16" y="40" width="96" height="14" rx="6" fill="hsl(var(--primary) / 0.3)" stroke="none" />
          <path d="M44 32 v-8 h40 v8" />
          <path d="M30 80 l16 -16 l14 12 l28 -28" />
          <circle cx="100" cy="48" r="2" fill={stroke} />
        </svg>
      );
    case "screener":
      return (
        <svg viewBox="0 0 128 128" fill="none" stroke={stroke} strokeWidth={2}>
          <rect x="14" y="20" width="100" height="88" rx="8" stroke="hsl(var(--border))" fill={fill} />
          <path d="M28 40 h72 M28 56 h44 M28 72 h60 M28 88 h32" />
          <circle cx="92" cy="86" r="14" fill="hsl(var(--background))" />
          <path d="M92 80 v6 l4 4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 128 128" fill="none" stroke={stroke} strokeWidth={2}>
          <circle cx="64" cy="64" r="48" stroke="hsl(var(--border))" fill={fill} />
          <path d="M40 80 l16 -16 l14 12 l28 -28" />
        </svg>
      );
  }
}
