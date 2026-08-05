"use client";

import * as React from "react";
import { BINANCE_TESTNET_BASE, SYMBOL_MAP } from "@/lib/trading/binance";

export type MarketTicker = {
  pair: string;
  price: number;
  change: number;
};

const MARKET_PAIRS = Object.keys(SYMBOL_MAP);

async function fetchMarketTickers(signal: AbortSignal) {
  const tickers = await Promise.all(
    MARKET_PAIRS.map(async (pair): Promise<MarketTicker | null> => {
      const response = await fetch(
        `${BINANCE_TESTNET_BASE}/fapi/v1/ticker/24hr?symbol=${SYMBOL_MAP[pair]}`,
        { cache: "no-store", signal },
      );

      if (!response.ok) return null;
      const data = await response.json();
      const price = Number(data.lastPrice);
      const change = Number(data.priceChangePercent);

      return Number.isFinite(price) && Number.isFinite(change)
        ? { pair, price, change }
        : null;
    }),
  );

  return tickers.filter((ticker): ticker is MarketTicker => ticker !== null);
}

export function useMarketTickers(refreshInterval = 30_000) {
  const [tickers, setTickers] = React.useState<MarketTicker[]>([]);

  React.useEffect(() => {
    let controller: AbortController | null = null;

    const load = async () => {
      controller?.abort();
      controller = new AbortController();

      try {
        const nextTickers = await fetchMarketTickers(controller.signal);
        if (nextTickers.length > 0) setTickers(nextTickers);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Failed to load market tickers:", error);
        }
      }
    };

    void load();
    const interval = window.setInterval(load, refreshInterval);

    return () => {
      window.clearInterval(interval);
      controller?.abort();
    };
  }, [refreshInterval]);

  return tickers;
}
