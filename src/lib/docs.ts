import fs from "fs";
import path from "path";

export interface DocEntry {
  slug: string;
  filename: string;
  title: string;
  description: string;
  order: number;
}

const DOCS_DIR = path.join(process.cwd(), "docs");

/** Map of slug → one-line description for the docs index page. */
const DESCRIPTIONS: Record<string, string> = {
  "00_START_HERE": "Overview, quick-start, and links to every doc",
  "01_SETUP": "Node requirements, install, DB init, reset, re-seed",
  "02_RUNNING": "Dev mode, production build, snapshot CLI, shortcuts, URL map",
  "03_FEATURES": "Per-feature deep-dive with file paths and test steps",
  "04_ARCHITECTURE": "System diagram, folder structure, data flow, SQLite schema",
  "05_FORMULAS": "Every valuation formula with math, source, and worked examples",
  "06_DATA_SOURCE": "Yahoo endpoints, rate limits, cache TTLs, alternatives",
  "07_WATCHLIST_AND_PORTFOLIO": "Adding positions, FIFO cost basis, benchmarks, backup",
  "08_SCREENER_GUIDE": "200-ticker universe, filter definitions, Graham presets",
  "09_TROUBLESHOOTING": "Symptom → cause → fix table",
  "10_ROADMAP": "Prioritised features with effort and API requirements",
  "11_CHANGELOG": "Version history",
};

function titleFromFilename(filename: string): string {
  const stem = filename.replace(/\.md$/, "");
  // Strip leading number + underscore (e.g., "00_START_HERE" → "Start Here")
  const withoutNum = stem.replace(/^\d+_/, "");
  return withoutNum
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function listDocs(): DocEntry[] {
  if (!fs.existsSync(DOCS_DIR)) return [];
  const files = fs.readdirSync(DOCS_DIR).filter((f) => {
    // Only include numbered docs (00_ through 11_), not reports/logs
    return /^\d{2}_.*\.md$/.test(f);
  });
  files.sort();
  return files.map((f, i) => {
    const slug = f.replace(/\.md$/, "");
    return {
      slug,
      filename: f,
      title: titleFromFilename(f),
      description: DESCRIPTIONS[slug] ?? "",
      order: i,
    };
  });
}

export function readDoc(slug: string): string | null {
  const filepath = path.join(DOCS_DIR, `${slug}.md`);
  if (!fs.existsSync(filepath)) return null;
  return fs.readFileSync(filepath, "utf-8");
}
