export type Exchange = "ASX" | "BSE" | "NSE" | "US";

export interface SearchResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  typeDisp?: string;
  exchange?: string;
}

export interface ChartPoint {
  t: number; // unix seconds
  c: number; // close
}

export interface ChartResponse {
  ticker: string;
  currency?: string;
  range: string;
  points: ChartPoint[];
  meta?: {
    regularMarketPrice?: number;
    chartPreviousClose?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    exchangeName?: string;
  };
}

export interface Fundamentals {
  ticker: string;
  exchange: Exchange;
  currency: string;
  longName?: string;
  shortName?: string;
  sector?: string;
  industry?: string;
  // price
  price?: number;
  marketCap?: number;
  sharesOutstanding?: number;
  // valuation
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  priceToSales?: number;
  enterpriseValue?: number;
  evToEbitda?: number;
  // per-share
  bookValuePerShare?: number;
  trailingEps?: number;
  forwardEps?: number;
  // balance sheet (totals)
  totalCurrentAssets?: number;
  totalCurrentLiabilities?: number;
  totalLiabilities?: number;
  totalAssets?: number;
  totalDebt?: number;
  cash?: number;
  // ratios
  currentRatio?: number;
  debtToEquity?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  // dividend
  dividendYield?: number;
  dividendRate?: number;
  payoutRatio?: number;
  // earnings
  ebitda?: number;
  netIncome?: number;
  revenue?: number;
  earningsGrowth?: number;
  revenueGrowth?: number;
  fiveYearAvgDividendYield?: number;
  // 52W
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  beta?: number;
  // raw modules in case we want them later
  raw?: unknown;
}
