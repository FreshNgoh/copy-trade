export const BINANCE_TESTNET_BASE = "https://demo-fapi.binance.com";

// Map trading pairs to Binance symbols (e.g., "BTC/USDC" -> "BTCUSDT")
export const SYMBOL_MAP: Record<string, string> = {
  "BTC/USDC": "BTCUSDT",
  "ETH/USDC": "ETHUSDT",
  "SOL/USDC": "SOLUSDT",
  "ARB/USDC": "ARBUSDT",
  // "PEPE/USDC": "PEPEUSDT",
  "LINK/USDC": "LINKUSDT",
};

// Normalize pair to Binance API symbol (e.g., "BTC/USDC" -> "BTCUSDT")
export function normalizeBinanceSymbol(pair: string): string {
  return SYMBOL_MAP[pair] || pair.replace("/", "").toUpperCase() + "USDT";
}

// Normalize pair to TradingView symbol (e.g., "BTC/USDC" -> "BINANCE:BTCUSDT")
export function normalizeTradingViewSymbol(pair: string): string {
  const binanceSymbol = normalizeBinanceSymbol(pair);
  return `BINANCE:${binanceSymbol}`;
}
