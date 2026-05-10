import type { Exchange } from "../yahoo/types";

// 50 liquid large-caps per exchange. Hand-picked — rotates rarely.
export const UNIVERSE: Record<Exchange, string[]> = {
  ASX: [
    "BHP.AX", "CBA.AX", "CSL.AX", "NAB.AX", "WBC.AX", "ANZ.AX", "MQG.AX", "FMG.AX",
    "WES.AX", "WOW.AX", "TLS.AX", "RIO.AX", "TCL.AX", "GMG.AX", "WDS.AX", "STO.AX",
    "ALL.AX", "QBE.AX", "REA.AX", "COL.AX", "AMC.AX", "RMD.AX", "JHX.AX", "ORG.AX",
    "SUN.AX", "S32.AX", "CPU.AX", "BXB.AX", "WTC.AX", "NCM.AX", "IAG.AX", "ASX.AX",
    "SCG.AX", "MIN.AX", "PLS.AX", "NST.AX", "EVN.AX", "XRO.AX", "TLC.AX", "MFG.AX",
    "AGL.AX", "ORA.AX", "ALD.AX", "MGR.AX", "DXS.AX", "COH.AX", "QAN.AX", "MPL.AX",
    "TWE.AX", "ALU.AX",
  ],
  BSE: [
    "RELIANCE.BO", "TCS.BO", "HDFCBANK.BO", "ICICIBANK.BO", "INFY.BO", "ITC.BO",
    "HINDUNILVR.BO", "SBIN.BO", "BHARTIARTL.BO", "LT.BO", "KOTAKBANK.BO", "BAJFINANCE.BO",
    "AXISBANK.BO", "ASIANPAINT.BO", "MARUTI.BO", "HCLTECH.BO", "WIPRO.BO", "ONGC.BO",
    "TATAMOTORS.BO", "TATASTEEL.BO", "SUNPHARMA.BO", "ULTRACEMCO.BO", "TITAN.BO",
    "NESTLEIND.BO", "POWERGRID.BO", "M&M.BO", "NTPC.BO", "BAJAJFINSV.BO", "HINDALCO.BO",
    "TECHM.BO", "INDUSINDBK.BO", "GRASIM.BO", "DRREDDY.BO", "JSWSTEEL.BO", "DIVISLAB.BO",
    "CIPLA.BO", "BRITANNIA.BO", "EICHERMOT.BO", "BPCL.BO", "COALINDIA.BO", "HEROMOTOCO.BO",
    "ADANIENT.BO", "ADANIPORTS.BO", "BAJAJ-AUTO.BO", "TATACONSUM.BO", "UPL.BO",
    "HDFCLIFE.BO", "SBILIFE.BO", "APOLLOHOSP.BO", "PIDILITIND.BO",
  ],
  NSE: [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS", "ITC.NS",
    "HINDUNILVR.NS", "SBIN.NS", "BHARTIARTL.NS", "LT.NS", "KOTAKBANK.NS", "BAJFINANCE.NS",
    "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS", "HCLTECH.NS", "WIPRO.NS", "ONGC.NS",
    "TATAMOTORS.NS", "TATASTEEL.NS", "SUNPHARMA.NS", "ULTRACEMCO.NS", "TITAN.NS",
    "NESTLEIND.NS", "POWERGRID.NS", "M&M.NS", "NTPC.NS", "BAJAJFINSV.NS", "HINDALCO.NS",
    "TECHM.NS", "INDUSINDBK.NS", "GRASIM.NS", "DRREDDY.NS", "JSWSTEEL.NS", "DIVISLAB.NS",
    "CIPLA.NS", "BRITANNIA.NS", "EICHERMOT.NS", "BPCL.NS", "COALINDIA.NS", "HEROMOTOCO.NS",
    "ADANIENT.NS", "ADANIPORTS.NS", "BAJAJ-AUTO.NS", "TATACONSUM.NS", "UPL.NS",
    "HDFCLIFE.NS", "SBILIFE.NS", "APOLLOHOSP.NS", "PIDILITIND.NS",
  ],
  US: [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "BRK-B", "TSLA", "JPM", "V",
    "UNH", "XOM", "MA", "JNJ", "PG", "HD", "AVGO", "CVX", "MRK", "PEP",
    "KO", "ABBV", "COST", "ADBE", "WMT", "MCD", "CSCO", "BAC", "CRM", "ACN",
    "AMD", "TMO", "LIN", "NKE", "DHR", "WFC", "DIS", "ABT", "TXN", "VZ",
    "QCOM", "PM", "INTU", "COP", "RTX", "LOW", "AXP", "ORCL", "T", "GS",
  ],
};

export const BENCHMARK: Record<Exchange, { ticker: string; name: string }> = {
  ASX: { ticker: "^AXJO", name: "S&P/ASX 200" },
  BSE: { ticker: "^BSESN", name: "BSE SENSEX" },
  NSE: { ticker: "^NSEI", name: "NIFTY 50" },
  US: { ticker: "^GSPC", name: "S&P 500" },
};
