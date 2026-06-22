"use client";

import * as React from "react";
import { CandlestickChart } from "@/components/trading/candlestick-chart";
import { OrderBook } from "@/components/trading/order-book";
import { TradePanel } from "@/components/trading/trade-panel";
import { getClosedPositionsApi, getPositionsApi } from "@/lib/api/position-api";
import { cn } from "@/lib/utils";
import { BINANCE_TESTNET_BASE, SYMBOL_MAP } from "@/lib/trading/binance";
import { PositionsTable } from "@/components/trading/position-table";
import { HistoryTable } from "@/components/trading/trade-history";
import { LimitOrder } from "@/components/trading/limit-order";
import { getLimitOrdersApi } from "@/lib/api/order-api";
import { PairSelector } from "@/components/trading/pair-selector";
import { useBinancePrice } from "@/hooks/use-binance-price";

const INITIAL_PAIRS = [
  { pair: "ETH/USDC", price: 0, change: 0, vol: "$0" },
  { pair: "BTC/USDC", price: 0, change: 0, vol: "$0" },
  { pair: "SOL/USDC", price: 0, change: 0, vol: "$0" },
  { pair: "ARB/USDC", price: 0, change: 0, vol: "$0" },
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
  const [activePositions, setActivePositions] = React.useState([]);
  const [closedPositions, setClosedPositions] = React.useState([]);
  const [orderPositions, setOrderPositions] = React.useState([]);

  const loadPositions = async () => {
    try {
      const positions = await getPositionsApi();
      setActivePositions(positions);
    } catch (error) {
      console.error("Failed to fetch positions:", error);
    }
  };

  React.useEffect(() => {
    loadPositions();
  }, []);

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

  React.useEffect(() => {
    const loadTradeHistory = async () => {
      try {
        const positions = await getClosedPositionsApi();
        setClosedPositions(positions);
      } catch (error) {
        console.error("Failed to fetch trade history:", error);
      }
    };

    loadTradeHistory();
  }, []);

  const loadLimitOrder = async () => {
    try {
      const orders = await getLimitOrdersApi();
      setOrderPositions(orders);
    } catch (error) {
      console.error("Failed to fetch trade history:", error);
    }
  };

  React.useEffect(() => {
    loadLimitOrder();
  }, []);

  // match with order book price and quantity
  const { bestBid, bestAsk, midPrice, askQty, bidQty } = useBinancePrice(
    activePair.pair,
  );
  const bookTickerRef = React.useRef({
    bestBid: 0,
    bestAsk: 0,
    askQty: 0,
    bidQty: 0,
  });

  React.useEffect(() => {
    if (!midPrice) return;

    setActivePair((prev) => ({
      ...prev,
      price: midPrice,
    }));
  }, [midPrice]);

  React.useEffect(() => {
    bookTickerRef.current = {
      bestBid,
      bestAsk,
      askQty,
      bidQty,
    };
  }, [bestBid, bestAsk, askQty, bidQty]);

  const hasOpenOrdersForActivePair = React.useMemo(
    () => orderPositions.some((order) => order.symbol === activePair.pair),
    [activePair.pair, orderPositions],
  );

  React.useEffect(() => {
    if (!hasOpenOrdersForActivePair) return;

    let isMatching = false;

    const matchOrders = async () => {
      if (isMatching) return;

      const { bestBid, bestAsk, askQty, bidQty } = bookTickerRef.current;

      if (!bestBid || !bestAsk) return;

      isMatching = true;

      try {
        await fetch("/api/orders/match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol: activePair.pair,
            bestBid,
            bestAsk,
            askQty,
            bidQty,
          }),
        });

        await loadPositions();
        await loadLimitOrder();
      } finally {
        isMatching = false;
      }
    };

    matchOrders();
    const interval = setInterval(matchOrders, 5000);

    return () => clearInterval(interval);
  }, [activePair.pair, hasOpenOrdersForActivePair]);

  return (
    <div data-testid="trade-page" className="bg-background min-h-screen pb-8">
      {/* Header bar */}
      <div className="bg-surface border-x border-b border-border px-5 py-3 flex flex-wrap items-center gap-6">
        <PairSelector
          pairs={pairs}
          activePair={activePair}
          setActivePair={setActivePair}
        />

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
          <TradePanel
            pair={activePair.pair}
            midPrice={activePair.price}
            onPositionCreated={loadPositions}
            onOrderCreated={loadLimitOrder}
          />
        </div>
      </div>

      {/* Bottom panel */}
      <div className="bg-surface border border-border mt-2">
        <div className="flex border-b border-border">
          {(
            [
              {
                id: "positions",
                label: `Positions (${activePositions.length})`,
              },
              {
                id: "orders",
                label: `Open Orders (${orderPositions.length})`,
              },
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
          <PositionsTable
            activePositions={activePositions}
            activePair={activePair}
            setActivePositions={setActivePositions}
            setClosedPositions={setClosedPositions}
          />
        )}

        {tab === "orders" && (
          <LimitOrder
            orderPosition={orderPositions}
            setActiveOrders={setOrderPositions}
          />
        )}

        {tab === "history" && (
          <HistoryTable closedPositions={closedPositions} />
        )}
      </div>
    </div>
  );
}
