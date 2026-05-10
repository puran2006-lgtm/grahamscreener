"use client";

import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs px-4 py-1.5 text-center flex items-center justify-center gap-2">
      <FlaskConical className="h-3.5 w-3.5" />
      <span>
        <strong>Demo Mode</strong> — Using fixture data. No Yahoo Finance
        calls. Run <code className="bg-amber-500/20 px-1 rounded text-[11px]">npm run dev</code> for live data.
      </span>
    </div>
  );
}
