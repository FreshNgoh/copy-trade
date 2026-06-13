"use client";

import * as React from "react";
import { CandlestickChart } from "@/components/trading/candlestick-chart";
import { OrderBook } from "@/components/trading/order-book";
import { TradePanel } from "@/components/trading/trade-panel";
import { ACTIVE_POSITIONS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { BINANCE_TESTNET_BASE, SYMBOL_MAP } from "@/lib/binance";

const INITIAL_PAIRS = [
  { pair: "ETH/USDC", price: 0, change: 0, vol: "$0" },
  { pair: "BTC/USDC", price: 0, change: 0, vol: "$0" },
  { pair: "SOL/USDC", price: 0, change: 0, vol: "$0" },
  { pair: "ARB/USDC", price: 0, change: 0, vol: "$0" },
  // { pair: "PEPE/USDC", price: 0, change: 0, vol: "$0" },
  { pair: "LINK/USDC", price: 0, change: 0, vol: "$0" },
];

async function fetchTickerData(pair: string) {
  const symbol = SYMBOL_MAP[pair];
  if (!symbol) return null;
  try {
    const response = await fetch(
      `${BINANCE_TESTNET_BASE}/fapi/v1/ticker/24hr?symbol=${symbol}`,
    );
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return {
      pair,
      price: parseFloat(data.lastPrice),
      change: parseFloat(data.priceChangePercent),
      vol: `$${(parseFloat(data.volume) / 1e6).toFixed(0)}M`,
    };
  } catch (error) {
    console.error(`Failed to fetch ticker for ${pair}:`, error);
    return null;
  }
}

async function fetchAllTickers() {
  const results = await Promise.all(
    INITIAL_PAIRS.map((p) => fetchTickerData(p.pair)),
  );
  return results.filter((r) => r !== null);
}

export default function TradePage() {
  const [pairs, setPairs] = React.useState(INITIAL_PAIRS);
  const [activePair, setActivePair] = React.useState(INITIAL_PAIRS[1]);
  const [tab, setTab] = React.useState<"positions" | "orders" | "history">(
    "positions",
  );

  React.useEffect(() => {
    const loadPairs = async () => {
      const tickers = await fetchAllTickers();
      if (tickers.length > 0) {
        setPairs(tickers);
        setActivePair((current) => {
          const updated = tickers.find(
            (ticker) => ticker.pair === current.pair,
          );
          return updated || tickers[1] || tickers[0];
        });
      }
    };

    loadPairs();
    const interval = setInterval(loadPairs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div data-testid="trade-page" className="bg-background min-h-screen pb-8">
      <div className="max-w-[1600px] mx-auto px-4 pt-4">
        {/* Pair selector / ticker */}
        <div className="bg-surface border border-border overflow-x-auto">
          <div className="flex items-stretch divide-x divide-border min-w-max">
            {pairs.map((p) => (
              <button
                key={p.pair}
                data-testid={`pair-${p.pair}`}
                onClick={() => setActivePair(p)}
                className={cn(
                  "px-5 py-3 text-left transition-colors min-w-[160px]",
                  activePair.pair === p.pair
                    ? "bg-background border-b-2 border-accent"
                    : "hover:bg-surface-hover",
                )}
              >
                <div className="font-mono text-xs text-muted-foreground">
                  {p.pair}
                </div>
                <div className="font-mono text-sm mt-0.5">
                  ${p.price < 1 ? p.price.toFixed(6) : p.price.toLocaleString()}
                </div>
                <div
                  className={cn(
                    "font-mono text-[10px] mt-0.5",
                    p.change >= 0 ? "text-success" : "text-danger",
                  )}
                >
                  {p.change >= 0 ? "+" : ""}
                  {p.change}%
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Header bar */}
        <div className="bg-surface border-x border-b border-border px-5 py-3 flex flex-wrap items-center gap-6">
          <div>
            <div className="font-heading text-xl font-bold tracking-tighter">
              {activePair.pair}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[10px] uppercase font-mono text-muted-foreground">
                Price
              </div>
              <div
                className={cn(
                  "font-mono text-lg",
                  activePair.change >= 0 ? "text-success" : "text-danger",
                )}
              >
                $
                {activePair.price < 1
                  ? activePair.price.toFixed(6)
                  : activePair.price.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-muted-foreground">
                24h Change
              </div>
              <div
                className={cn(
                  "font-mono text-sm",
                  activePair.change >= 0 ? "text-success" : "text-danger",
                )}
              >
                {activePair.change >= 0 ? "+" : ""}
                {activePair.change}%
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-muted-foreground">
                24h Volume
              </div>
              <div className="font-mono text-sm">{activePair.vol}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-muted-foreground">
                Funding
              </div>
              <div className="font-mono text-sm text-success">+0.012%</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-muted-foreground">
                Open Interest
              </div>
              <div className="font-mono text-sm">$184.2M</div>
            </div>
          </div>
        </div>

        {/* Grid: Chart | OrderBook | TradePanel */}
        <div className="grid grid-cols-12 gap-2 mt-2">
          <div className="col-span-12 lg:col-span-7 bg-surface border border-border max-h-[650px] overflow-hidden">
            <CandlestickChart pair={activePair.pair} />
          </div>
          <div className="col-span-6 lg:col-span-2 max-h-[650px] overflow-hidden">
            <OrderBook pair={activePair.pair} midPrice={activePair.price} />
          </div>
          <div className="col-span-6 lg:col-span-3 max-h-[650px] overflow-hidden">
            <TradePanel pair={activePair.pair} midPrice={activePair.price} />
          </div>
        </div>

        {/* Bottom panel */}
        <div className="bg-surface border border-border mt-2">
          <div className="flex border-b border-border">
            {(
              [
                {
                  id: "positions",
                  label: `Positions (${ACTIVE_POSITIONS.length})`,
                },
                { id: "orders", label: "Open Orders (0)" },
                { id: "history", label: "Trade History" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                data-testid={`bottom-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-5 py-2.5 text-xs font-mono uppercase tracking-wider",
                  tab === t.id
                    ? "text-white border-b-2 border-accent"
                    : "text-muted-foreground hover:text-white",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "positions" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border">
                    <th className="text-left px-4 py-2">Pair</th>
                    <th className="text-left px-4 py-2">Side</th>
                    <th className="text-right px-4 py-2">Size</th>
                    <th className="text-right px-4 py-2">Entry</th>
                    <th className="text-right px-4 py-2">Mark</th>
                    <th className="text-right px-4 py-2">Liq Price</th>
                    <th className="text-right px-4 py-2">PnL</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {ACTIVE_POSITIONS.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border hover:bg-surface-hover"
                    >
                      <td className="px-4 py-2.5 font-mono text-sm">
                        {p.pair}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "text-[10px] font-mono uppercase px-1.5 py-0.5 border",
                            p.side === "LONG"
                              ? "border-success text-success"
                              : "border-danger text-danger",
                          )}
                        >
                          {p.side} {p.leverage}×
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">
                        ${p.size.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">
                        ${p.entry.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">
                        ${p.mark.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-warning">
                        ${p.liquidation.toLocaleString()}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-mono text-sm",
                          p.pnl >= 0 ? "text-success" : "text-danger",
                        )}
                      >
                        {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button className="text-[10px] uppercase font-mono border border-border px-2 py-1 hover:border-danger hover:text-danger">
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "orders" && (
            <div className="py-16 text-center text-muted-foreground font-mono text-sm">
              No open orders
            </div>
          )}
          {tab === "history" && (
            <div className="py-16 text-center text-muted-foreground font-mono text-sm">
              Trade history is being reconstructed from on-chain events...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
