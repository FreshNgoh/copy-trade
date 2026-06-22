"use client";

import * as React from "react";
import { SYMBOL_MAP } from "@/lib/trading/binance";

export function useBinancePrice(pair: string) {
  const [bookTicker, setBookTicker] = React.useState({
    bestBid: 0,
    bestAsk: 0,
    bidQty: 0,
    askQty: 0,
    midPrice: 0,
  });

  React.useEffect(() => {
    const symbol = SYMBOL_MAP[pair]?.toLowerCase();
    if (!symbol) return;

    const ws = new WebSocket(
      `wss://fstream.binancefuture.com/ws/${symbol}@bookTicker`,
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      const bestBid = Number(data.b);
      const bestAsk = Number(data.a);
      const bidQty = Number(data.B);
      const askQty = Number(data.A);

      setBookTicker({
        bestBid,
        bestAsk,
        bidQty,
        askQty,
        midPrice: (bestBid + bestAsk) / 2,
      });
    };

    ws.onerror = (error) => {
      console.error("Binance WS error:", error);
    };

    return () => ws.close();
  }, [pair]);

  return bookTicker;
}
