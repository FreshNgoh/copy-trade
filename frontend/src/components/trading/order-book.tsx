"use client";

import * as React from "react";
import {
  BINANCE_TESTNET_BASE,
  normalizeBinanceSymbol,
} from "@/lib/trading/binance";

interface OrderLevel {
  price: number;
  size: number;
  total: number;
}

interface OrderBookData {
  bids: OrderLevel[];
  asks: OrderLevel[];
}

async function fetchOrderBook(pair: string): Promise<OrderBookData> {
  const symbol = normalizeBinanceSymbol(pair);
  try {
    const response = await fetch(
      `${BINANCE_TESTNET_BASE}/fapi/v1/depth?symbol=${symbol}&limit=20`,
    );
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    const data = await response.json();

    const bids: OrderLevel[] = (data.bids || []).map(
      ([price, quantity]: [string, string]) => {
        const p = parseFloat(price);
        const s = parseFloat(quantity);
        return { price: p, size: s, total: p * s };
      },
    );

    const asks: OrderLevel[] = (data.asks || []).map(
      ([price, quantity]: [string, string]) => {
        const p = parseFloat(price);
        const s = parseFloat(quantity);
        return { price: p, size: s, total: p * s };
      },
    );

    return { bids, asks };
  } catch (error) {
    console.error("Failed to fetch order book:", error);
    return { bids: [], asks: [] };
  }
}

export function OrderBook({
  pair = "BTC/USDC",
  midPrice,
}: {
  pair?: string;
  midPrice: number;
}) {
  const [book, setBook] = React.useState<OrderBookData>({ bids: [], asks: [] });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadOrderBook = async () => {
      setLoading(true);
      const data = await fetchOrderBook(pair);
      setBook(data);
      setLoading(false);
    };

    loadOrderBook();
    const interval = setInterval(loadOrderBook, 3000);
    return () => clearInterval(interval);
  }, [pair]);

  const maxTotal = Math.max(
    ...(book.bids.map((b) => b.total) || [0]),
    ...(book.asks.map((a) => a.total) || [0]),
  );

  if (loading && book.bids.length === 0 && book.asks.length === 0) {
    return (
      <div
        data-testid="order-book"
        className="bg-surface border border-border h-full flex flex-col"
      >
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Order Book
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            USDT
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="order-book"
      className="bg-surface border border-border h-full flex flex-col"
    >
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          Order Book
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          USDT
        </span>
      </div>

      <div className="px-3 py-1.5 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (top, red, reversed) */}
      <div className="flex-1 overflow-hidden">
        {book.asks
          .slice()
          .reverse()
          .map((a, i) => (
            <div
              key={`ask-${i}`}
              className="relative px-3 py-1 grid grid-cols-3 gap-2 font-mono text-[11px] hover:bg-surface-hover"
            >
              <span
                className="absolute right-0 top-0 bottom-0 bg-danger/10"
                style={{
                  width: `${maxTotal > 0 ? (a.total / maxTotal) * 100 : 0}%`,
                }}
              />
              <span className="relative text-danger">
                {a.price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="relative text-right">{a.size.toFixed(4)}</span>
              <span className="relative text-right text-muted-foreground">
                {a.total.toFixed(2)}
              </span>
            </div>
          ))}
      </div>

      {/* Spread */}
      <div className="px-3 py-2 border-y border-border flex items-center justify-between bg-muted/30">
        <span className="font-mono text-base font-medium text-success">
          {midPrice.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          Spread 0.02%
        </span>
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-hidden">
        {book.bids.map((b, i) => (
          <div
            key={`bid-${i}`}
            className="relative px-3 py-1 grid grid-cols-3 gap-2 font-mono text-[11px] hover:bg-surface-hover"
          >
            <span
              className="absolute right-0 top-0 bottom-0 bg-success/10"
              style={{
                width: `${maxTotal > 0 ? (b.total / maxTotal) * 100 : 0}%`,
              }}
            />
            <span className="relative text-success">
              {b.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="relative text-right">{b.size.toFixed(4)}</span>
            <span className="relative text-right text-muted-foreground">
              {b.total.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
