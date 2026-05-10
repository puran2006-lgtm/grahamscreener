# Screener Guide

## The 200-Ticker Universe

GrahamScreener screens a fixed universe of 50 liquid large-caps per exchange. The list is defined in `src/lib/universe/index.ts`.

### ASX (50 tickers)

| Ticker | Name | Sector |
|---|---|---|
| BHP.AX | BHP Group | Materials |
| CBA.AX | Commonwealth Bank | Financials |
| CSL.AX | CSL Limited | Healthcare |
| NAB.AX | National Australia Bank | Financials |
| WBC.AX | Westpac Banking | Financials |
| ANZ.AX | ANZ Group | Financials |
| MQG.AX | Macquarie Group | Financials |
| FMG.AX | Fortescue | Materials |
| WES.AX | Wesfarmers | Consumer Discretionary |
| WOW.AX | Woolworths Group | Consumer Staples |
| TLS.AX | Telstra Group | Communication Services |
| RIO.AX | Rio Tinto | Materials |
| TCL.AX | Transurban Group | Industrials |
| GMG.AX | Goodman Group | Real Estate |
| WDS.AX | Woodside Energy | Energy |
| STO.AX | Santos | Energy |
| ALL.AX | Aristocrat Leisure | Consumer Discretionary |
| QBE.AX | QBE Insurance | Financials |
| REA.AX | REA Group | Communication Services |
| COL.AX | Coles Group | Consumer Staples |
| AMC.AX | Amcor | Materials |
| RMD.AX | ResMed | Healthcare |
| JHX.AX | James Hardie | Materials |
| ORG.AX | Origin Energy | Energy |
| SUN.AX | Suncorp Group | Financials |
| S32.AX | South32 | Materials |
| CPU.AX | Computershare | Information Technology |
| BXB.AX | Brambles | Industrials |
| WTC.AX | WiseTech Global | Information Technology |
| NCM.AX | Newcrest Mining | Materials |
| IAG.AX | Insurance Australia | Financials |
| ASX.AX | ASX Limited | Financials |
| SCG.AX | Scentre Group | Real Estate |
| MIN.AX | Mineral Resources | Materials |
| PLS.AX | Pilbara Minerals | Materials |
| NST.AX | Northern Star | Materials |
| EVN.AX | Evolution Mining | Materials |
| XRO.AX | Xero | Information Technology |
| TLC.AX | Lottery Corp | Consumer Discretionary |
| MFG.AX | Magellan Financial | Financials |
| AGL.AX | AGL Energy | Utilities |
| ORA.AX | Orora | Materials |
| ALD.AX | Ampol | Energy |
| MGR.AX | Mirvac Group | Real Estate |
| DXS.AX | Dexus | Real Estate |
| COH.AX | Cochlear | Healthcare |
| QAN.AX | Qantas Airways | Industrials |
| MPL.AX | Medibank Private | Financials |
| TWE.AX | Treasury Wine Estates | Consumer Staples |
| ALU.AX | Altium | Information Technology |

### BSE (50 tickers)

| Ticker | Name | Sector |
|---|---|---|
| RELIANCE.BO | Reliance Industries | Energy |
| TCS.BO | Tata Consultancy Services | IT |
| HDFCBANK.BO | HDFC Bank | Financials |
| ICICIBANK.BO | ICICI Bank | Financials |
| INFY.BO | Infosys | IT |
| ITC.BO | ITC | Consumer Staples |
| HINDUNILVR.BO | Hindustan Unilever | Consumer Staples |
| SBIN.BO | State Bank of India | Financials |
| BHARTIARTL.BO | Bharti Airtel | Communication Services |
| LT.BO | Larsen & Toubro | Industrials |
| KOTAKBANK.BO | Kotak Mahindra Bank | Financials |
| BAJFINANCE.BO | Bajaj Finance | Financials |
| AXISBANK.BO | Axis Bank | Financials |
| ASIANPAINT.BO | Asian Paints | Materials |
| MARUTI.BO | Maruti Suzuki | Consumer Discretionary |
| HCLTECH.BO | HCL Technologies | IT |
| WIPRO.BO | Wipro | IT |
| ONGC.BO | ONGC | Energy |
| TATAMOTORS.BO | Tata Motors | Consumer Discretionary |
| TATASTEEL.BO | Tata Steel | Materials |
| SUNPHARMA.BO | Sun Pharma | Healthcare |
| ULTRACEMCO.BO | UltraTech Cement | Materials |
| TITAN.BO | Titan Company | Consumer Discretionary |
| NESTLEIND.BO | Nestle India | Consumer Staples |
| POWERGRID.BO | Power Grid Corp | Utilities |
| M&M.BO | Mahindra & Mahindra | Consumer Discretionary |
| NTPC.BO | NTPC | Utilities |
| BAJAJFINSV.BO | Bajaj Finserv | Financials |
| HINDALCO.BO | Hindalco Industries | Materials |
| TECHM.BO | Tech Mahindra | IT |
| INDUSINDBK.BO | IndusInd Bank | Financials |
| GRASIM.BO | Grasim Industries | Materials |
| DRREDDY.BO | Dr. Reddy's | Healthcare |
| JSWSTEEL.BO | JSW Steel | Materials |
| DIVISLAB.BO | Divi's Laboratories | Healthcare |
| CIPLA.BO | Cipla | Healthcare |
| BRITANNIA.BO | Britannia Industries | Consumer Staples |
| EICHERMOT.BO | Eicher Motors | Consumer Discretionary |
| BPCL.BO | BPCL | Energy |
| COALINDIA.BO | Coal India | Energy |
| HEROMOTOCO.BO | Hero MotoCorp | Consumer Discretionary |
| ADANIENT.BO | Adani Enterprises | Industrials |
| ADANIPORTS.BO | Adani Ports | Industrials |
| BAJAJ-AUTO.BO | Bajaj Auto | Consumer Discretionary |
| TATACONSUM.BO | Tata Consumer Products | Consumer Staples |
| UPL.BO | UPL | Materials |
| HDFCLIFE.BO | HDFC Life Insurance | Financials |
| SBILIFE.BO | SBI Life Insurance | Financials |
| APOLLOHOSP.BO | Apollo Hospitals | Healthcare |
| PIDILITIND.BO | Pidilite Industries | Materials |

### NSE (50 tickers)

The NSE universe mirrors the BSE list with `.NS` suffix instead of `.BO`. Same 50 companies, different exchange. Examples: `RELIANCE.NS`, `TCS.NS`, `HDFCBANK.NS`.

### US (50 tickers)

| Ticker | Name | Sector |
|---|---|---|
| AAPL | Apple | Technology |
| MSFT | Microsoft | Technology |
| GOOGL | Alphabet | Communication Services |
| AMZN | Amazon | Consumer Discretionary |
| NVDA | NVIDIA | Technology |
| META | Meta Platforms | Communication Services |
| BRK-B | Berkshire Hathaway | Financials |
| TSLA | Tesla | Consumer Discretionary |
| JPM | JPMorgan Chase | Financials |
| V | Visa | Financials |
| UNH | UnitedHealth | Healthcare |
| XOM | ExxonMobil | Energy |
| MA | Mastercard | Financials |
| JNJ | Johnson & Johnson | Healthcare |
| PG | Procter & Gamble | Consumer Staples |
| HD | Home Depot | Consumer Discretionary |
| AVGO | Broadcom | Technology |
| CVX | Chevron | Energy |
| MRK | Merck | Healthcare |
| PEP | PepsiCo | Consumer Staples |
| KO | Coca-Cola | Consumer Staples |
| ABBV | AbbVie | Healthcare |
| COST | Costco | Consumer Staples |
| ADBE | Adobe | Technology |
| WMT | Walmart | Consumer Staples |
| MCD | McDonald's | Consumer Discretionary |
| CSCO | Cisco | Technology |
| BAC | Bank of America | Financials |
| CRM | Salesforce | Technology |
| ACN | Accenture | Technology |
| AMD | AMD | Technology |
| TMO | Thermo Fisher | Healthcare |
| LIN | Linde | Materials |
| NKE | Nike | Consumer Discretionary |
| DHR | Danaher | Healthcare |
| WFC | Wells Fargo | Financials |
| DIS | Walt Disney | Communication Services |
| ABT | Abbott Labs | Healthcare |
| TXN | Texas Instruments | Technology |
| VZ | Verizon | Communication Services |
| QCOM | Qualcomm | Technology |
| PM | Philip Morris | Consumer Staples |
| INTU | Intuit | Technology |
| COP | ConocoPhillips | Energy |
| RTX | RTX Corporation | Industrials |
| LOW | Lowe's | Consumer Discretionary |
| AXP | American Express | Financials |
| ORCL | Oracle | Technology |
| T | AT&T | Communication Services |
| GS | Goldman Sachs | Financials |

## Filter Definitions

| Filter | What it measures | Graham's logic |
|---|---|---|
| **Max P/E** | Price-to-earnings ratio (trailing 12M). Lower = cheaper relative to earnings. | Graham recommended P/E ≤ 15 for defensive investors. |
| **Max P/B** | Price-to-book ratio. Lower = cheaper relative to net assets. | Graham recommended P/B ≤ 1.5, or P/E × P/B ≤ 22.5. |
| **Min Current Ratio** | Current assets ÷ current liabilities. Higher = more liquid. | Graham recommended ≥ 2.0 for defensive investors (strong liquidity). |
| **Max Debt/Equity** | Total debt ÷ shareholder equity. Lower = less leveraged. | Graham preferred companies with minimal long-term debt. Threshold varies by industry. |
| **Min Dividend Yield** | Annual dividend ÷ price. Higher = more income. | Graham valued consistent dividends as a sign of financial health. |

Note: The screener divides Yahoo's `debtToEquity` by 100 (Yahoo reports as percentage, e.g., 150 = 1.5× D/E).

## Presets

### Defensive Investor (Graham Ch. 14)

From *The Intelligent Investor*, Chapter 14 — "Stock Selection for the Defensive Investor":

| Filter | Value | Rationale |
|---|---|---|
| Max P/E | 15 | "The current price should not be more than 15 times average earnings of the past three years" |
| Max P/B | 1.5 | "Current price should not be more than 1.5 times the book value last reported" |
| Min Current Ratio | 2.0 | "Current assets should be at least twice current liabilities" |
| Max D/E | 1.0 | "Long-term debt should not exceed the net current assets (working capital)" |
| Min Dividend Yield | 0% | Defensive investors want dividends but Graham didn't set a hard minimum |

### Enterprising Investor (Graham Ch. 15)

From *The Intelligent Investor*, Chapter 15 — "Stock Selection for the Enterprising Investor":

| Filter | Value | Rationale |
|---|---|---|
| Max P/E | 10 | Enterprising investors demand a deeper discount — Graham sought P/E below 10 |
| Max P/B | 1.2 | Tighter book-value constraint for bargain hunters |
| Min Current Ratio | 1.5 | Slightly relaxed from defensive — allows more cyclical businesses |
| Max D/E | 0.5 | Stricter leverage requirement — strong balance sheet focus |
| Min Dividend Yield | 0% | Not required — the enterprising investor buys on value, not yield |

### Income Preset

| Filter | Value |
|---|---|
| Max P/E | 25 |
| Min Dividend Yield | 3% |

### Quality + Cheap Preset

| Filter | Value |
|---|---|
| Max P/E | 20 |
| Max P/B | 3.0 |
| Max D/E | 1.0 |
| Min Current Ratio | 1.5 |

---

Last updated: 2026-05-09 by Claude Cowork
