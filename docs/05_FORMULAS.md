# Valuation Formulas

All formulas are implemented in `src/lib/valuation/index.ts`. Each function returns a `ValuationResult` with `value`, `formula` string, `inputs` map, and optional `notes`.

## 1. Graham Number

**Plain English:** The maximum price a defensive investor should pay, assuming the stock deserves at most 15× earnings and 1.5× book value simultaneously.

**Formula:**

```
Graham Number = √(22.5 × EPS × BVPS)
```

Where:
- `22.5` = 15 (max P/E) × 1.5 (max P/B)
- `EPS` = trailing twelve-month earnings per share
- `BVPS` = book value per share

**Requires:** Both EPS and BVPS must be positive. Returns `null` otherwise.

**Source:** Benjamin Graham, *The Intelligent Investor* (1949), Chapter 14 — "Stock Selection for the Defensive Investor." The 22.5 composite multiplier is Graham's rule that a stock should not have both a high P/E and a high P/B simultaneously.

**Code path:** `src/lib/valuation/index.ts` → `grahamNumber(f: Fundamentals)`

**Worked example (AAPL):**
- EPS = $6.42, BVPS = $4.38
- Graham Number = √(22.5 × 6.42 × 4.38) = √(632.45) = **$25.15**
- At a market price of ~$195, AAPL trades far above its Graham Number — typical for a growth company. The Graham Number is most useful for mature, asset-heavy businesses.

## 2. NCAV Per Share (Net-Net)

**Plain English:** The amount you'd receive per share if the company liquidated all current assets, paid off every liability, and distributed the remainder. Buying below NCAV means you're paying less than liquidation value.

**Formula:**

```
NCAV / share = (Total Current Assets − Total Liabilities) / Shares Outstanding
```

**Requires:** Current assets, total liabilities, and share count must all be available. Returns `null` otherwise.

**Source:** Benjamin Graham, *Security Analysis* (1934), Part V — "Analysis of the Balance Sheet." Graham famously sought stocks trading below two-thirds of NCAV as extreme deep-value opportunities.

**Code path:** `src/lib/valuation/index.ts` → `ncavPerShare(f: Fundamentals)`

**Worked example (AAPL):**
- Total Current Assets = $143.6B, Total Liabilities = $279.4B, Shares = 15.3B
- NCAV/share = ($143.6B − $279.4B) / 15.3B = **−$8.87**
- Negative NCAV is normal for large-caps with significant long-term debt. A positive NCAV trading below market price is rare and potentially very attractive.

## 3. Earnings Power Value (EPV) Per Share

**Plain English:** What the company is worth based purely on its current earning power, assuming no growth ever. Uses EBITDA as a proxy for normalised earnings, applies a tax rate, and discounts at a fixed cost of capital.

**Formula:**

```
EPV / share = (EBITDA × (1 − tax)) / WACC / Shares Outstanding
```

Where:
- `tax` = 25% (fixed — defensible global proxy)
- `WACC` = 9% (fixed — long-run equity risk premium for liquid large-caps)

**Requires:** Positive EBITDA and share count. Returns `null` otherwise.

**Source:** Bruce Greenwald, *Value Investing: From Graham to Buffett and Beyond* (2001), Chapter 5 — "Earnings Power Value." Greenwald's EPV strips out growth to isolate the value of the existing business, making it a useful sanity check against growth-inflated DCF models.

**Code path:** `src/lib/valuation/index.ts` → `epvPerShare(f: Fundamentals)`

**Worked example (AAPL):**
- EBITDA = $130.5B, Shares = 15.3B, tax = 25%, WACC = 9%
- EPV/share = ($130.5B × 0.75) / 0.09 / 15.3B = $97.88B / 15.3B = **$71.07**
- EPV is below market price because it ignores Apple's growth entirely. The gap between EPV and market price represents the market's growth expectations.

## 4. Graham Growth Formula

**Plain English:** Graham's revised (1962) formula for estimating intrinsic value of a growth stock, adjusted for the prevailing interest rate environment.

**Formula:**

```
V = EPS × (8.5 + 2g) × 4.4 / Y
```

Where:
- `EPS` = trailing twelve-month earnings per share
- `g` = expected annual EPS growth rate (%), capped at 15%, floored at −5%
- `8.5` = P/E of a stock with zero growth
- `4.4` = average AAA corporate bond yield when Graham wrote the formula (%)
- `Y` = current AAA corporate bond yield (%) — fixed at 4.5% as a long-run proxy

**Requires:** Positive trailing EPS. If Yahoo's `earningsGrowth` is missing, defaults g to 5%.

**Source:** Benjamin Graham, *The Intelligent Investor* (1949, revised 1962 edition), Chapter 11. The `4.4/Y` adjustment was Graham's way of normalising for interest-rate environments different from his era.

**Code path:** `src/lib/valuation/index.ts` → `grahamGrowth(f: Fundamentals)`

**Worked example (AAPL):**
- EPS = $6.42, earningsGrowth = 10.3% (from Yahoo) → g = 10.3 (capped at 15)
- V = $6.42 × (8.5 + 2 × 10.3) × 4.4 / 4.5
- V = $6.42 × 29.1 × 0.978 = **$182.72**
- At ~$195, AAPL is close to fair value by this model — a small negative margin of safety.

## 5. Margin of Safety

**Plain English:** How far below intrinsic value the current price sits. Positive = undervalued (a "margin of safety" exists). Negative = overvalued.

**Formula:**

```
MoS = (Intrinsic Value − Price) / Intrinsic Value
```

**Colour scale used in the UI:**

| MoS | Label | Colour |
|---|---|---|
| ≥ 30% | Wide margin of safety | Green |
| ≥ 10% | Some margin of safety | Light green |
| ≥ −10% | Around fair value | Amber |
| < −10% | Overvalued | Red |

**Code path:** `src/lib/valuation/index.ts` → `marginOfSafety(price, intrinsic)`

The `computeValuations()` function computes MoS for all four models simultaneously and returns a `ValuationBundle` with both the raw values and the MoS percentages.

---

Last updated: 2026-05-09 by Claude Cowork
