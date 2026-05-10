# Rebrand Log: ValueLens → GrahamScreener

**Date:** 2026-05-09
**Trigger:** Registration of grahamscreener.com (Cloudflare, auto-renews May 2027)
**Version:** 1.2.1

## Summary

| Metric | Count |
|---|---|
| Files modified | 18 |
| Files created | 2 (this log + REBRAND_INVENTORY.md) |
| User-facing string replacements | 22 |
| Historical docs with rebrand note prepended | 6 |
| References intentionally preserved | 12 |

## Files Modified

| # | File | Changes |
|---|---|---|
| 1 | `src/app/layout.tsx` | Title → "GrahamScreener — Value investing screener for global equities"; description updated |
| 2 | `src/components/layout/app-shell.tsx` | Sidebar brand "ValueLens" → "GrahamScreener"; subtitle → "Graham-discipline screener"; mobile header updated |
| 3 | `src/app/docs/page.tsx` | "ValueLens Docs" → "GrahamScreener Docs"; description updated |
| 4 | `package.json` | `"name": "valuelens"` → `"name": "grahamscreener"` |
| 5 | `package-lock.json` | `"name": "valuelens"` → `"name": "grahamscreener"` (2 occurrences) |
| 6 | `README.md` | `# ValueLens` → `# GrahamScreener`; new tagline; added grahamscreener.com link |
| 7 | `docs/00_START_HERE.md` | Title, "What is" heading, intro paragraph; added grahamscreener.com link |
| 8 | `docs/01_SETUP.md` | 2 product name references |
| 9 | `docs/02_RUNNING.md` | H1 heading |
| 10 | `docs/06_DATA_SOURCE.md` | 2 product name references |
| 11 | `docs/07_WATCHLIST_AND_PORTFOLIO.md` | 2 product name references |
| 12 | `docs/08_SCREENER_GUIDE.md` | 1 product name reference |
| 13 | `docs/09_TROUBLESHOOTING.md` | 1 product name reference |
| 14 | `DECISIONS.md` | Prepended rebrand note; updated intro line; appended rebrand decision section |
| 15 | `docs/11_CHANGELOG.md` | Prepended rebrand note; updated "All notable changes to" line; added v1.2.1 entry |
| 16 | `docs/COWORK_REPORT.md` | Prepended rebrand note |
| 17 | `docs/COWORK_REPORT_v1.2.md` | Prepended rebrand note |
| 18 | `docs/TEST_RESULTS.md` | Prepended rebrand note |
| 19 | `docs/AUDIT_LOG_v1.2.md` | Prepended rebrand note |

## Files Created

| # | File | Purpose |
|---|---|---|
| 1 | `docs/REBRAND_INVENTORY.md` | Pre-replacement inventory of all matches |
| 2 | `docs/REBRAND_LOG.md` | This file |

## References Intentionally NOT Changed

| Reference | Location | Reason |
|---|---|---|
| `valuelens.db` | `src/lib/db/index.ts:8` | DB filename stays per instructions |
| `valuelens.db` | `src/app/api/health/route.ts:11,62` | DB filename reference |
| `valuelens.db` | `README.md:25,87` | DB filename documentation |
| `valuelens.db` | `docs/01_SETUP.md:29,56,71,82` | DB filename documentation |
| `valuelens.db` | `docs/04_ARCHITECTURE.md:32,51` | DB filename in schema/tree |
| `valuelens.db` | `docs/07_WATCHLIST_AND_PORTFOLIO.md:135,139,154` | DB filename documentation |
| `valuelens.db` | `docs/09_TROUBLESHOOTING.md:8,41` | DB filename documentation |
| `valuelens.db` | `docs/TEST_RESULTS.md:16` | DB filename in test results |
| `valuelens/` | `docs/01_SETUP.md:17,80` | Folder name (unchanged per instructions) |
| `valuelens/` | `docs/04_ARCHITECTURE.md:49` | Folder tree root label |
| `valuelens && cd valuelens` | `docs/00_START_HERE.md:29` | Git clone folder name |
| Historical "ValueLens" | DECISIONS.md, CHANGELOG, COWORK_REPORT*.md, TEST_RESULTS.md, AUDIT_LOG | Historical accuracy — rebrand note prepended instead |

## Verification Results

| Check | Result |
|---|---|
| `grep -r "ValueLens" src/` | **0 matches** — zero user-facing references in source |
| `grep -r "ValueLens" docs/` (excluding historical + inventory) | **0 matches** |
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | Sandbox timeout (45s limit) — not a code issue; tsc confirms types are clean |
| Sidebar brand text | "GrahamScreener" |
| Page title metadata | "GrahamScreener — Value investing screener for global equities" |
| Package name | `grahamscreener` |

---

Last updated: 2026-05-09 by Claude Cowork
