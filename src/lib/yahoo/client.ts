import type {
  ChartResponse,
  Exchange,
  Fundamentals,
  SearchResult,
} from "./types";
import { exchangeFromTicker, currencyFromExchange } from "../utils";
import { getSession, invalidateSession } from "./session";
import { isDemoMode, demoQuote, demoChart, demoSearch } from "../demo";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

function baseHeaders(extra?: HeadersInit): HeadersInit {
  return {
    "User-Agent": UA,
    Accept: "application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://finance.yahoo.com/",
    Origin: "https://finance.yahoo.com",
    ...(extra ?? {}),
  };
}

interface FetchOpts {
  withCrumb?: boolean;
}

async function fetchJSON<T>(url: string, opts: FetchOpts = {}): Promise<T> {
  const tryOnce = async (force: boolean): Promise<Response> => {
    const session = await getSession(force);
    const u = new URL(url);
    if (opts.withCrumb && session.crumb) {
      u.searchParams.set("crumb", session.crumb);
    }
    return fetch(u.toString(), {
      headers: baseHeaders(session.cookie ? { Cookie: session.cookie } : undefined),
      cache: "no-store",
    });
  };

  let res = await tryOnce(false);
  if (res.status === 401 || res.status === 403 || res.status === 429) {
    invalidateSession();
    res = await tryOnce(true);
  }
  if (!res.ok) {
    throw new Error(`Yahoo fetch failed ${res.status}: ${url}`);
  }
  return (await res.json()) as T;
}

interface YahooSearchAPI {
  quotes?: Array<{
    symbol: string;
    shortname?: string;
    longname?: string;
    exchDisp?: string;
    typeDisp?: string;
    exchange?: string;
    quoteType?: string;
  }>;
}

export async function yahooSearch(query: string, limit = 10): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  if (isDemoMode()) {
    const results = demoSearch(query);
    return results ? results.slice(0, limit) : [];
  }
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    query
  )}&quotesCount=${limit}&newsCount=0`;
  const data = await fetchJSON<YahooSearchAPI>(url);
  const items = data.quotes ?? [];
  return items
    .filter((q) => q.quoteType === "EQUITY" || q.typeDisp === "Equity")
    .slice(0, limit)
    .map((q) => ({
      symbol: q.symbol,
      shortname: q.shortname,
      longname: q.longname,
      exchDisp: q.exchDisp,
      typeDisp: q.typeDisp,
      exchange: q.exchange,
    }));
}

interface YahooChartAPI {
  chart: {
    result?: Array<{
      meta: {
        currency?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
        exchangeName?: string;
      };
      timestamp?: number[];
      indicators: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
        adjclose?: Array<{
          adjclose?: Array<number | null>;
        }>;
      };
    }>;
    error?: { code: string; description: string } | null;
  };
}

export async function yahooChart(
  ticker: string,
  range: "1y" | "5y" | "max" | "1mo" | "3mo" | "6mo" = "1y",
  interval: string = "1d"
): Promise<ChartResponse> {
  if (isDemoMode()) {
    const fixture = demoChart(ticker);
    if (fixture) return fixture;
    // Fall through to live API if no fixture exists
  }
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?range=${range}&interval=${interval}&includePrePost=false`;
  const data = await fetchJSON<YahooChartAPI>(url);
  const result = data.chart.result?.[0];
  if (!result) {
    throw new Error(`No chart data for ${ticker}`);
  }
  const ts = result.timestamp ?? [];
  const adj = result.indicators.adjclose?.[0]?.adjclose;
  const close = result.indicators.quote?.[0]?.close;
  const series = adj && adj.length === ts.length ? adj : close ?? [];
  const points = ts
    .map((t, i) => ({ t, c: series[i] }))
    .filter((p): p is { t: number; c: number } => p.c !== null && p.c !== undefined && !Number.isNaN(p.c));
  return {
    ticker,
    currency: result.meta.currency,
    range,
    points,
    meta: {
      regularMarketPrice: result.meta.regularMarketPrice,
      chartPreviousClose: result.meta.chartPreviousClose,
      fiftyTwoWeekHigh: result.meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: result.meta.fiftyTwoWeekLow,
      exchangeName: result.meta.exchangeName,
    },
  };
}

interface YahooModuleVal {
  raw?: number;
  fmt?: string;
}
interface QSPrice {
  regularMarketPrice?: YahooModuleVal;
  marketCap?: YahooModuleVal;
  currency?: string;
  longName?: string;
  shortName?: string;
  exchangeName?: string;
}
interface QSSummaryDetail {
  trailingPE?: YahooModuleVal;
  forwardPE?: YahooModuleVal;
  priceToSalesTrailing12Months?: YahooModuleVal;
  dividendYield?: YahooModuleVal;
  dividendRate?: YahooModuleVal;
  payoutRatio?: YahooModuleVal;
  fiveYearAvgDividendYield?: YahooModuleVal;
  beta?: YahooModuleVal;
  fiftyTwoWeekHigh?: YahooModuleVal;
  fiftyTwoWeekLow?: YahooModuleVal;
}
interface QSDefaultKeyStats {
  enterpriseValue?: YahooModuleVal;
  forwardEps?: YahooModuleVal;
  trailingEps?: YahooModuleVal;
  priceToBook?: YahooModuleVal;
  bookValue?: YahooModuleVal;
  enterpriseToEbitda?: YahooModuleVal;
  sharesOutstanding?: YahooModuleVal;
  earningsQuarterlyGrowth?: YahooModuleVal;
}
interface QSFinancialData {
  currentPrice?: YahooModuleVal;
  totalCash?: YahooModuleVal;
  totalDebt?: YahooModuleVal;
  currentRatio?: YahooModuleVal;
  debtToEquity?: YahooModuleVal;
  returnOnEquity?: YahooModuleVal;
  returnOnAssets?: YahooModuleVal;
  ebitda?: YahooModuleVal;
  totalRevenue?: YahooModuleVal;
  revenuePerShare?: YahooModuleVal;
  revenueGrowth?: YahooModuleVal;
  earningsGrowth?: YahooModuleVal;
  grossMargins?: YahooModuleVal;
  operatingMargins?: YahooModuleVal;
  profitMargins?: YahooModuleVal;
}
interface QSAssetProfile {
  sector?: string;
  industry?: string;
}
interface QSBalanceSheet {
  balanceSheetStatements?: Array<{
    totalCurrentAssets?: YahooModuleVal;
    totalCurrentLiabilities?: YahooModuleVal;
    totalLiab?: YahooModuleVal;
    totalAssets?: YahooModuleVal;
    cash?: YahooModuleVal;
    shortLongTermDebt?: YahooModuleVal;
    longTermDebt?: YahooModuleVal;
  }>;
}
interface QSIncomeStatement {
  incomeStatementHistory?: Array<{
    netIncome?: YahooModuleVal;
    totalRevenue?: YahooModuleVal;
  }>;
}
interface YahooQuoteSummaryAPI {
  quoteSummary: {
    result?: Array<{
      price?: QSPrice;
      summaryDetail?: QSSummaryDetail;
      defaultKeyStatistics?: QSDefaultKeyStats;
      financialData?: QSFinancialData;
      assetProfile?: QSAssetProfile;
      balanceSheetHistory?: QSBalanceSheet;
      incomeStatementHistory?: QSIncomeStatement;
    }>;
    error?: { code: string; description: string } | null;
  };
}

const v = (x?: YahooModuleVal) => (x?.raw === undefined || x?.raw === null ? undefined : x.raw);

export async function yahooFundamentals(ticker: string): Promise<Fundamentals> {
  if (isDemoMode()) {
    const fixture = demoQuote(ticker);
    if (fixture) return fixture;
    // Fall through to live API if no fixture exists
  }
  const exchange = exchangeFromTicker(ticker) as Exchange;
  const modules = [
    "price",
    "summaryDetail",
    "defaultKeyStatistics",
    "financialData",
    "assetProfile",
    "balanceSheetHistory",
    "incomeStatementHistory",
  ].join(",");
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    ticker
  )}?modules=${modules}`;
  const data = await fetchJSON<YahooQuoteSummaryAPI>(url, { withCrumb: true });
  const r = data.quoteSummary.result?.[0];
  if (!r) {
    throw new Error(`No fundamentals for ${ticker}`);
  }
  const bs = r.balanceSheetHistory?.balanceSheetStatements?.[0];
  const incomeStmt = r.incomeStatementHistory?.incomeStatementHistory?.[0];
  const computedDebt = (v(bs?.shortLongTermDebt) ?? 0) + (v(bs?.longTermDebt) ?? 0);
  const totalDebt =
    v(r.financialData?.totalDebt) ?? (computedDebt > 0 ? computedDebt : undefined);

  const currency = r.price?.currency ?? currencyFromExchange(exchange);
  return {
    ticker,
    exchange,
    currency,
    longName: r.price?.longName,
    shortName: r.price?.shortName,
    sector: r.assetProfile?.sector,
    industry: r.assetProfile?.industry,
    price: v(r.financialData?.currentPrice) ?? v(r.price?.regularMarketPrice),
    marketCap: v(r.price?.marketCap),
    sharesOutstanding: v(r.defaultKeyStatistics?.sharesOutstanding),
    trailingPE: v(r.summaryDetail?.trailingPE),
    forwardPE: v(r.summaryDetail?.forwardPE),
    priceToBook: v(r.defaultKeyStatistics?.priceToBook),
    priceToSales: v(r.summaryDetail?.priceToSalesTrailing12Months),
    enterpriseValue: v(r.defaultKeyStatistics?.enterpriseValue),
    evToEbitda: v(r.defaultKeyStatistics?.enterpriseToEbitda),
    bookValuePerShare: v(r.defaultKeyStatistics?.bookValue),
    trailingEps: v(r.defaultKeyStatistics?.trailingEps),
    forwardEps: v(r.defaultKeyStatistics?.forwardEps),
    totalCurrentAssets: v(bs?.totalCurrentAssets),
    totalCurrentLiabilities: v(bs?.totalCurrentLiabilities),
    totalLiabilities: v(bs?.totalLiab),
    totalAssets: v(bs?.totalAssets),
    totalDebt,
    cash: v(r.financialData?.totalCash) ?? v(bs?.cash),
    currentRatio: v(r.financialData?.currentRatio),
    debtToEquity: v(r.financialData?.debtToEquity),
    returnOnEquity: v(r.financialData?.returnOnEquity),
    returnOnAssets: v(r.financialData?.returnOnAssets),
    dividendYield: v(r.summaryDetail?.dividendYield),
    dividendRate: v(r.summaryDetail?.dividendRate),
    payoutRatio: v(r.summaryDetail?.payoutRatio),
    ebitda: v(r.financialData?.ebitda),
    netIncome: v(incomeStmt?.netIncome),
    revenue: v(r.financialData?.totalRevenue) ?? v(incomeStmt?.totalRevenue),
    earningsGrowth: v(r.financialData?.earningsGrowth),
    revenueGrowth: v(r.financialData?.revenueGrowth),
    fiveYearAvgDividendYield: v(r.summaryDetail?.fiveYearAvgDividendYield),
    fiftyTwoWeekHigh: v(r.summaryDetail?.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: v(r.summaryDetail?.fiftyTwoWeekLow),
    beta: v(r.summaryDetail?.beta),
  };
}
