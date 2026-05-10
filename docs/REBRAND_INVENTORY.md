# Rebrand Inventory: ValueLens → GrahamScreener

**Date:** 2026-05-09
**Scope:** All casing variants of "ValueLens" across the project.

## References to CHANGE

### Source Code (.ts, .tsx)

| File | Line | Match | Action |
|---|---|---|---|
| `src/app/layout.tsx` | 16 | `"ValueLens — Multi-exchange value-investing screener"` | Replace title |
| `src/app/layout.tsx` | 18 | `"ASX, BSE, NSE, US value-investing screener..."` | Replace description |
| `src/components/layout/app-shell.tsx` | 80 | `ValueLens` (sidebar brand name) | Replace |
| `src/components/layout/app-shell.tsx` | 82 | `Value-investing terminal` (subtitle) | Replace tagline |
| `src/components/layout/app-shell.tsx` | 166 | `ValueLens` (mobile header) | Replace |
| `src/app/docs/page.tsx` | 21 | `ValueLens Docs` | Replace |
| `src/app/docs/page.tsx` | 24 | `"...understand ValueLens —"` | Replace |

### JSON Configs

| File | Line | Match | Action |
|---|---|---|---|
| `package.json` | 2 | `"name": "valuelens"` | → `"grahamscreener"` |
| `package-lock.json` | 2, 8 | `"name": "valuelens"` | → `"grahamscreener"` |

### Markdown Docs

| File | Lines | Matches | Action |
|---|---|---|---|
| `README.md` | 1 | `# ValueLens` | Replace |
| `README.md` | 3 | product description | Replace |
| `docs/00_START_HERE.md` | 1, 3, 5 | `ValueLens` | Replace |
| `docs/01_SETUP.md` | 12, 67 | `ValueLens` | Replace |
| `docs/02_RUNNING.md` | 1 | `# Running ValueLens` | Replace |
| `docs/04_ARCHITECTURE.md` | 49 | `valuelens/` (folder tree label) | Replace with comment |
| `docs/06_DATA_SOURCE.md` | 53, 85 | `ValueLens` | Replace |
| `docs/07_WATCHLIST_AND_PORTFOLIO.md` | 82, 114 | `ValueLens` | Replace |
| `docs/08_SCREENER_GUIDE.md` | 5 | `ValueLens` | Replace |
| `docs/09_TROUBLESHOOTING.md` | 25 | `ValueLens` | Replace |

## References to PRESERVE (historical records — prepend rebrand note)

| File | Lines | Reason |
|---|---|---|
| `DECISIONS.md` | 3, 19, 142, 158 | Historical decision log |
| `docs/11_CHANGELOG.md` | 3, 56 | Historical changelog |
| `docs/COWORK_REPORT.md` | 4, 15 | Historical v1.1 report |
| `docs/COWORK_REPORT_v1.2.md` | 28 | Historical v1.2 report |

## References to PRESERVE (technical — not user-facing)

| File | Line | Match | Reason |
|---|---|---|---|
| `src/lib/db/index.ts` | 8 | `valuelens.db` | DB filename stays per instructions |
| `src/app/api/health/route.ts` | 11, 62 | `valuelens.db` | DB filename reference |
| `README.md` | 23, 85 | `valuelens.db` | DB filename documentation |
| `docs/01_SETUP.md` | 29, 56, 71, 82 | `valuelens.db` | DB filename documentation |
| `docs/04_ARCHITECTURE.md` | 32, 51 | `valuelens.db` | DB filename in schema/tree |
| `docs/07_WATCHLIST_AND_PORTFOLIO.md` | 135, 139, 154 | `valuelens.db` | DB filename documentation |
| `docs/09_TROUBLESHOOTING.md` | 8, 41 | `valuelens.db` | DB filename documentation |
| `docs/TEST_RESULTS.md` | 14 | `valuelens.db` | DB filename documentation |
| `docs/00_START_HERE.md` | 27, 64 | `valuelens` in git clone / db paths | Folder name + DB filename |
| `docs/01_SETUP.md` | 17, 80 | `valuelens` in cd command / folder tree | Folder name |
| `docs/AUDIT_LOG_v1.2.md` | all | No ValueLens references | No changes needed |

---

Last updated: 2026-05-09 by Claude Cowork
