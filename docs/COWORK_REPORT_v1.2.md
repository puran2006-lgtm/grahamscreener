# Cowork Report — v1.2

> **Note:** The product was renamed from ValueLens to GrahamScreener on 2026-05-09. This report retains the original name for accuracy.

**Date:** 2026-05-09
**Author:** Claude Cowork

## Summary

v1.2 closes the three remaining gaps from v1.1: documentation accuracy, in-app docs browsing, and offline development support. All changes compile cleanly (`tsc --noEmit` passes with zero errors).

## Phases Completed

### Phase 1: Documentation Accuracy Audit

Cross-referenced all 13 docs against source code. 22 checks performed covering file paths, npm scripts, API routes, SQLite schema, valuation formulas (4 formulas, 5 constants), cache TTLs (4 values), universe tickers (200), and screener presets.

**Result:** 6 fixes applied (all related to Health page/route missing from v1.1 docs). 100% accuracy confirmed on formulas, tickers, schema, and TTLs.

**Deliverable:** `docs/AUDIT_LOG_v1.2.md`

### Phase 2: In-App Docs Web Viewer

Installed `react-markdown`, `remark-gfm`, `rehype-highlight` (3 new deps).

**Files created:**
- `src/lib/docs.ts` — `listDocs()` and `readDoc()` utilities reading from `/docs`
- `src/app/docs/page.tsx` — Index page with card grid of all numbered docs
- `src/app/docs/[slug]/page.tsx` — Individual doc page with sidebar nav, prev/next buttons, current page highlight
- `src/components/docs/doc-renderer.tsx` — Client component with react-markdown, GFM tables, syntax highlighting (One Dark colour scheme), and scoped CSS matching the ValueLens dark theme

**Files modified:**
- `src/components/layout/app-shell.tsx` — Added `BookOpen` icon import and "Docs" link in sidebar footer

### Phase 3: Demo Mode + Fixtures

**Architecture:** `DEMO_MODE=true` env var intercepted at the Yahoo client level. `src/lib/demo.ts` reads fixture JSON from `/fixtures`. All downstream code (valuations, screener filters, chart rendering) runs identically whether data comes from Yahoo or fixtures.

**Files created:**
- `src/lib/demo.ts` — `isDemoMode()`, `demoQuote()`, `demoChart()`, `demoSearch()`, `demoUniverse()`
- `src/components/demo-banner.tsx` — Amber notification bar when demo mode is active
- `fixtures/` — 38 fixture files:
  - 5 quote fixtures for seeded tickers (AAPL, BRK-B, CBA.AX, RELIANCE.BO, INFY.NS)
  - 5 chart fixtures with 252-point time series (1 year of trading days)
  - 1 search fixture with keyed lookup
  - 27 additional quote fixtures for screener coverage across all 4 exchanges

**Files modified:**
- `src/lib/yahoo/client.ts` — Added demo mode checks to `yahooSearch()`, `yahooChart()`, `yahooFundamentals()`
- `src/app/api/screener/route.ts` — Serves fixture data when in demo mode; GET returns demo universe
- `src/app/api/health/route.ts` — Includes `demoMode` flag in response
- `src/app/layout.tsx` — Conditionally renders `DemoBanner` when `DEMO_MODE=true`
- `package.json` — Added `dev:demo` script

### Phase 4: Maintenance Updates

**Files modified:**
- `docs/00_START_HERE.md` — Added docs viewer, demo mode to feature table and quick-start section
- `docs/11_CHANGELOG.md` — Added v1.2.0 entry with full Added/Changed/Fixed sections
- `DECISIONS.md` — Appended v1.2 section: docs viewer (reversing prior skip decision), demo mode rationale, audit documentation
- `README.md` — Added `dev:demo` to quick-start, features #9 (docs) and #10 (demo mode), updated project layout with fixtures/ and demo.ts

### Phase 5: Final Verification

- `npx tsc --noEmit` — **0 errors**
- All new files created at correct paths
- No files deleted
- All doc footers include "Last updated: 2026-05-09 by Claude Cowork"

## File Inventory

### New files (11)
| File | Purpose |
|---|---|
| `src/lib/demo.ts` | Demo mode fixture loader |
| `src/lib/docs.ts` | Doc listing and reading utilities |
| `src/app/docs/page.tsx` | Docs index page |
| `src/app/docs/[slug]/page.tsx` | Individual doc page with sidebar |
| `src/components/docs/doc-renderer.tsx` | Markdown renderer with syntax highlighting |
| `src/components/demo-banner.tsx` | Demo mode notification banner |
| `docs/AUDIT_LOG_v1.2.md` | Documentation accuracy audit trail |
| `docs/COWORK_REPORT_v1.2.md` | This report |
| `fixtures/` (38 files) | Demo mode fixture data |

### Modified files (10)
| File | Change |
|---|---|
| `src/lib/yahoo/client.ts` | Demo mode interception |
| `src/app/api/screener/route.ts` | Demo mode data serving |
| `src/app/api/health/route.ts` | Demo mode flag |
| `src/app/layout.tsx` | Demo banner |
| `src/components/layout/app-shell.tsx` | Docs sidebar link |
| `package.json` | `dev:demo` script |
| `docs/00_START_HERE.md` | Docs + demo mode entries |
| `docs/02_RUNNING.md` | Health route entries (audit fix) |
| `docs/04_ARCHITECTURE.md` | Health route in tree + diagram (audit fix) |
| `docs/11_CHANGELOG.md` | v1.2.0 entry |
| `DECISIONS.md` | v1.2 section appended |
| `README.md` | Demo mode + docs features |

## What to test locally

```bash
# Standard mode (live Yahoo data)
npm run dev
# Visit: /docs, /docs/00_START_HERE, /health

# Demo mode (fixture data, no network)
npm run dev:demo
# Visit: /stock/AAPL, /screener (select any exchange), Cmd+K search "AAPL"
# Amber demo banner should appear at top
```

---

Last updated: 2026-05-09 by Claude Cowork
