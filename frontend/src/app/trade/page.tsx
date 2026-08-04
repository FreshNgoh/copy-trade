"use client";

import * as React from "react";
import { CandlestickChart } from "@/components/trading/candlestick-chart";
import { OrderBook } from "@/components/trading/order-book";
import { TradePanel } from "@/components/trading/trade-panel";
import {
  closePositionApi,
  getClosedPositionsApi,
  getPositionsApi,
} from "@/lib/api/position-api";
import { cn } from "@/lib/utils";
import { BINANCE_TESTNET_BASE, SYMBOL_MAP } from "@/lib/trading/binance";
import { PositionsTable } from "@/components/trading/position-table";
import { HistoryTable } from "@/components/trading/trade-history";
import { LimitOrder } from "@/components/trading/limit-order";
import { getLimitOrdersApi } from "@/lib/api/order-api";
import { PairSelector } from "@/components/trading/pair-selector";
import { useBinancePrice } from "@/hooks/use-binance-price";
import { useAccount, usePublicClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ExternalLink, Info } from "lucide-react";
import { addNotification } from "@/lib/notifications";
import { toast } from "sonner";
import type { Position } from "@/types/position";
import { getTraderDashboardApi } from "@/lib/api/trader-dashboard-api";
import { Switch } from "@/components/ui/switch";
import { readUserTradeHistoryRecords } from "@/lib/web3/trade-history/client";
import { TRADE_HISTORY_CONTRACT_ADDRESS } from "@/lib/web3/trade-history/constants";
import type { OnChainTradeRecord } from "@/lib/web3/trade-history/types";
import { masterTraderRegistryReadAbi } from "@/lib/web3/master-registry/read-abi";
import { MASTER_REGISTRY_CONTRACT_ADDRESS } from "@/lib/web3/master-registry/constants";
import { applyTradeHistorySourceOverrides } from "@/lib/web3/trade-history/source";

const INITIAL_PAIRS = [
  { pair: "ETH/USDC", price: 0, change: 0, vol: "$0" },
  { pair: "BTC/USDC", price: 0, change: 0, vol: "$0" },
  { pair: "SOL/USDC", price: 0, change: 0, vol: "$0" },
  { pair: "ARB/USDC", price: 0, change: 0, vol: "$0" },
  { pair: "LINK/USDC", price: 0, change: 0, vol: "$0" },
];

function getTradeModeStorageKey(address: string) {
  return `copy-trade:trade-mode:${address.toLowerCase()}`;
}

function dateToUnixSeconds(value?: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? BigInt(Math.floor(timestamp / 1000)) : null;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

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
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const [pairs, setPairs] = React.useState(INITIAL_PAIRS);
  const [activePair, setActivePair] = React.useState(INITIAL_PAIRS[1]);
  const [tab, setTab] = React.useState<"positions" | "orders" | "history">(
    "positions",
  );
  const [activePositions, setActivePositions] = React.useState<Position[]>([]);
  const [tradeHistoryRecords, setTradeHistoryRecords] = React.useState<
    OnChainTradeRecord[]
  >([]);
  const [isTradeHistoryLoading, setIsTradeHistoryLoading] =
    React.useState(false);
  const [tradeHistoryError, setTradeHistoryError] = React.useState<
    string | null
  >(null);
  const [orderPositions, setOrderPositions] = React.useState([]);
  const [tradeMode, setTradeMode] = React.useState<"MANUAL" | "COPY">("MANUAL");
  const [isVerifiedMaster, setIsVerifiedMaster] = React.useState(false);
  const [masterVerifiedAt, setMasterVerifiedAt] = React.useState<bigint | null>(null);
  const liquidationWarningsRef = React.useRef(new Set<string>());
  const liquidationClosingRef = React.useRef(false);

  const loadPositions = React.useCallback(async () => {
    if (!address) {
      setActivePositions([]);
      return;
    }

    try {
      const positions = await getPositionsApi(address);
      setActivePositions(positions);
    } catch (error) {
      console.error("Failed to fetch positions:", error);
    }
  }, [address]);

  React.useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  React.useEffect(() => {
    let cancelled = false;

    if (!address) {
      setIsVerifiedMaster(false);
      setMasterVerifiedAt(null);
      setTradeMode("MANUAL");
      return;
    }

    getTraderDashboardApi(address)
      .then((dashboard) => {
        if (cancelled) return;
        const verified = Boolean(dashboard.portfolio?.is_verified_master);
        setIsVerifiedMaster(verified);
        setMasterVerifiedAt(
          verified ? dateToUnixSeconds(dashboard.portfolio?.master_verified_at) : null,
        );
        if (verified) {
          const savedMode = window.localStorage.getItem(
            getTradeModeStorageKey(address),
          );
          setTradeMode(savedMode === "COPY" ? "COPY" : "MANUAL");
        } else {
          setTradeMode("MANUAL");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setIsVerifiedMaster(false);
        setMasterVerifiedAt(null);
        setTradeMode("MANUAL");
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadMasterVerification() {
      if (!address || !publicClient || !MASTER_REGISTRY_CONTRACT_ADDRESS) {
        setMasterVerifiedAt(null);
        return;
      }

      try {
        const verification = await publicClient.readContract({
          address: MASTER_REGISTRY_CONTRACT_ADDRESS,
          abi: masterTraderRegistryReadAbi,
          functionName: "getMasterVerification",
          args: [address],
        });

        if (!cancelled) {
          setMasterVerifiedAt(
            verification.verified && verification.verifiedAt > 0n
              ? verification.verifiedAt
              : null,
          );
        }
      } catch {
        if (!cancelled) {
          setMasterVerifiedAt(null);
        }
      }
    }

    loadMasterVerification();

    return () => {
      cancelled = true;
    };
  }, [address, publicClient]);

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

  const loadTradeHistory = React.useCallback(async () => {
    if (!address || !publicClient || !TRADE_HISTORY_CONTRACT_ADDRESS) {
      setTradeHistoryRecords([]);
      setTradeHistoryError(null);
      return;
    }

    setIsTradeHistoryLoading(true);
    setTradeHistoryError(null);

    try {
      const [records, closedPositions] = await Promise.all([
        readUserTradeHistoryRecords({
          publicClient,
          user: address,
        }),
        getClosedPositionsApi(address).catch(() => []),
      ]);
      setTradeHistoryRecords(
        applyTradeHistorySourceOverrides(records, closedPositions).toReversed(),
      );
    } catch (error) {
      console.error("Failed to fetch on-chain trade history:", error);
      setTradeHistoryError(
        error instanceof Error
          ? error.message
          : "Failed to fetch on-chain trade history",
      );
    } finally {
      setIsTradeHistoryLoading(false);
    }
  }, [address, publicClient]);

  React.useEffect(() => {
    loadTradeHistory();
  }, [loadTradeHistory]);

  const loadLimitOrder = React.useCallback(async () => {
    if (!address) {
      setOrderPositions([]);
      return;
    }

    try {
      const orders = await getLimitOrdersApi(address);
      setOrderPositions(orders);
    } catch (error) {
      console.error("Failed to fetch trade history:", error);
    }
  }, [address]);

  React.useEffect(() => {
    loadLimitOrder();
  }, [loadLimitOrder]);

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
    if (!address || !activePositions.length || liquidationClosingRef.current)
      return;

    const isCopyPosition = (position: Position) =>
      position.trade_source === "MASTER_COPY" ||
      position.trade_source === "COPY" ||
      Boolean(position.copied_from_master);
    const pricedPositions = activePositions
      .map((position) => {
        const market = pairs.find((item) => item.pair === position.symbol);
        const markPrice = Number(market?.price || 0);
        const entryPrice = Number(position.entry_price);
        const liquidationPrice = Number(position.liquidation_price || 0);
        const liquidationDistance = Math.abs(entryPrice - liquidationPrice);
        if (markPrice <= 0 || liquidationPrice <= 0 || liquidationDistance <= 0)
          return null;
        const adverseMove =
          position.direction === "LONG"
            ? entryPrice - markPrice
            : markPrice - entryPrice;
        return {
          position,
          markPrice,
          progress: adverseMove / liquidationDistance,
        };
      })
      .filter(Boolean) as Array<{
      position: Position;
      markPrice: number;
      progress: number;
    }>;

    pricedPositions.forEach(({ position, progress }) => {
      if (
        progress >= 0.9 &&
        progress < 1 &&
        !liquidationWarningsRef.current.has(position.position_id)
      ) {
        liquidationWarningsRef.current.add(position.position_id);
        addNotification(address, {
          type: "liquidation_warning",
          title: "Liquidation risk above 90%",
          message: `${position.symbol} is close to its liquidation price of $${Number(position.liquidation_price).toFixed(2)}.`,
        });
        toast.warning(`${position.symbol} is close to liquidation`);
      }
    });

    const liquidatedWallets = new Set(
      pricedPositions
        .filter(({ progress }) => progress >= 1)
        .map(({ position }) => (isCopyPosition(position) ? "copy" : "manual")),
    );
    if (!liquidatedWallets.size) return;
    liquidationClosingRef.current = true;

    const closeLiquidatedWalletPositions = async () => {
      let closedCount = 0;
      const positionsToClose = activePositions.filter((position) =>
        liquidatedWallets.has(isCopyPosition(position) ? "copy" : "manual"),
      );
      for (const position of positionsToClose) {
        const market = pairs.find((item) => item.pair === position.symbol);
        const closingPrice = Number(market?.price || 0);
        if (closingPrice <= 0) continue;
        const quantity = Number(position.quantity);
        const entryPrice = Number(position.entry_price);
        const pnl =
          position.direction === "LONG"
            ? (closingPrice - entryPrice) * quantity
            : (entryPrice - closingPrice) * quantity;
        const margin = (entryPrice * quantity) / Number(position.leverage || 1);
        const roi = margin > 0 ? (pnl / margin) * 100 : 0;
        await closePositionApi({
          position_id: position.position_id,
          trader_wallet_address: position.trader_wallet_address,
          closing_price: closingPrice,
          updated_at: new Date().toISOString(),
          status: "CLOSED",
          Pnl: pnl,
          Roi: roi,
        });
        closedCount += 1;
      }
      addNotification(address, {
        type: "liquidation",
        title: "Positions liquidated",
        message: `${closedCount} open position${closedCount === 1 ? " was" : "s were"} in the affected wallet ${closedCount === 1 ? "was" : "were"} force-closed after its liquidation threshold was reached.`,
      });
      toast.error(
        "Liquidation threshold reached. Positions in the affected wallet were closed.",
      );
      await Promise.all([loadPositions(), loadTradeHistory()]);
    };

    closeLiquidatedWalletPositions()
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Forced liquidation failed",
        );
      })
      .finally(() => {
        liquidationClosingRef.current = false;
      });
  }, [activePositions, address, loadPositions, loadTradeHistory, pairs]);

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
  const hasTriggerablePositionsForActivePair = React.useMemo(
    () =>
      activePositions.some(
        (position) =>
          position.symbol === activePair.pair &&
          (Number(position.take_profit) > 0 || Number(position.stop_loss) > 0),
      ),
    [activePair.pair, activePositions],
  );

  const markPrices = React.useMemo(
    () =>
      Object.fromEntries([
        ...pairs.map((market) => [market.pair, Number(market.price)]),
        [activePair.pair, Number(activePair.price)],
      ]),
    [activePair, pairs],
  );
  const tradeHistoryContractUrl = TRADE_HISTORY_CONTRACT_ADDRESS
    ? `https://sepolia.etherscan.io/address/${TRADE_HISTORY_CONTRACT_ADDRESS}`
    : null;

  React.useEffect(() => {
    if (!hasOpenOrdersForActivePair && !hasTriggerablePositionsForActivePair) {
      return;
    }

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
        await loadTradeHistory();
        await loadLimitOrder();
      } finally {
        isMatching = false;
      }
    };

    matchOrders();
    const interval = setInterval(matchOrders, 5000);

    return () => clearInterval(interval);
  }, [
    activePair.pair,
    hasOpenOrdersForActivePair,
    hasTriggerablePositionsForActivePair,
    loadLimitOrder,
    loadPositions,
    loadTradeHistory,
  ]);

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
              {activePair.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
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

        {isVerifiedMaster && (
          <div className="ml-auto flex max-w-[320px] items-center gap-3 border border-border bg-surface px-3 py-2">
            <Info className="h-4 w-4 flex-shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="font-mono text-[10px] uppercase text-muted-foreground">
                  Copy Mode
                </div>
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase",
                    tradeMode === "COPY" ? "text-accent" : "text-muted-foreground",
                  )}
                >
                  {tradeMode === "COPY" ? "On" : "Off"}
                </span>
              </div>
              <div className="mt-0.5 text-xs leading-snug text-muted-foreground">
                {tradeMode === "COPY"
                  ? "New market trades use Copy Wallet and followers can copy them."
                  : "New trades stay manual and will not be copied by followers."}
              </div>
            </div>
            <Switch
              checked={tradeMode === "COPY"}
              onCheckedChange={(checked) => {
                const nextMode = checked ? "COPY" : "MANUAL";
                setTradeMode(nextMode);
                if (address) {
                  window.localStorage.setItem(
                    getTradeModeStorageKey(address),
                    nextMode,
                  );
                }
              }}
              aria-label="Toggle copy trading mode"
              className="data-[state=checked]:bg-accent"
            />
          </div>
        )}
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
            tradeMode={tradeMode}
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
            markPrices={markPrices}
            setActivePositions={setActivePositions}
            onTradeHistoryRefresh={loadTradeHistory}
          />
        )}

        {tab === "orders" && (
          <LimitOrder
            orderPosition={orderPositions}
            setActiveOrders={setOrderPositions}
          />
        )}

        {tab === "history" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                On-chain records from TradeHistory
              </div>
              {tradeHistoryContractUrl ? (
                <a
                  href={tradeHistoryContractUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent transition-colors hover:text-white"
                >
                  View Contract {shortAddress(TRADE_HISTORY_CONTRACT_ADDRESS)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <div className="font-mono text-[10px] uppercase tracking-wider text-danger">
                  Missing TradeHistory contract address
                </div>
              )}
            </div>
            <HistoryTable
              records={tradeHistoryRecords}
              isLoading={isTradeHistoryLoading}
              error={tradeHistoryError}
              verifiedAt={masterVerifiedAt}
            />
          </>
        )}
      </div>
    </div>
  );
}
