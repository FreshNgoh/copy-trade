'use client';

import * as React from 'react';
import { generateOrderBook } from '@/lib/mock-data';

export function OrderBook({ midPrice }: { midPrice: number }) {
  const [book, setBook] = React.useState(() => generateOrderBook(midPrice));

  React.useEffect(() => {
    const interval = setInterval(() => {
      setBook(generateOrderBook(midPrice * (1 + (Math.random() - 0.5) * 0.002)));
    }, 2500);
    return () => clearInterval(interval);
  }, [midPrice]);

  const maxTotal = Math.max(
    ...book.bids.map((b) => b.total),
    ...book.asks.map((a) => a.total)
  );

  return (
    <div data-testid="order-book" className="bg-surface border border-border h-full flex flex-col">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          Order Book
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">USDC</span>
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
                style={{ width: `${(a.total / maxTotal) * 100}%` }}
              />
              <span className="relative text-danger">{a.price.toLocaleString()}</span>
              <span className="relative text-right">{a.size.toFixed(2)}</span>
              <span className="relative text-right text-muted-foreground">{a.total.toFixed(2)}</span>
            </div>
          ))}
      </div>

      {/* Spread */}
      <div className="px-3 py-2 border-y border-border flex items-center justify-between bg-muted/30">
        <span className="font-mono text-base font-medium text-success">
          {midPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              style={{ width: `${(b.total / maxTotal) * 100}%` }}
            />
            <span className="relative text-success">{b.price.toLocaleString()}</span>
            <span className="relative text-right">{b.size.toFixed(2)}</span>
            <span className="relative text-right text-muted-foreground">{b.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
