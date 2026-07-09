"use client";

import * as React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, usePublicClient, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { type Address } from "viem";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { tradeHistoryAbi } from "@/lib/web3/trade-history/abi";
import { TRADE_HISTORY_CONTRACT_ADDRESS } from "@/lib/web3/trade-history/constants";
import {
  bytes32ToString,
  formatPnl,
  formatPrice,
  formatQuantity,
  formatRoi,
  formatTimestamp
} from "@/lib/web3/trade-history/format";

type TradeRecord = {
  tradeId: bigint;
  user: Address;
  openTime: bigint;
  closedTime: bigint;
  direction: number;
  quantityDecimals: number;
  priceDecimals: number;
  pnlDecimals: number;
  roiDecimals: number;
  symbol: `0x${string}`;
  quantity: bigint;
  entryPrice: bigint;
  closingPrice: bigint;
  pnl: bigint;
  roi: bigint;
};

export function TradeHistoryPage() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const [records, setRecords] = React.useState<TradeRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isWrongChain = isConnected && chainId !== sepolia.id;

  React.useEffect(() => {
    let cancelled = false;

    async function loadTradeHistory() {
      if (
        !isConnected ||
        !address ||
        isWrongChain ||
        !publicClient ||
        !TRADE_HISTORY_CONTRACT_ADDRESS
      ) {
        setRecords([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const tradeIds = await publicClient.readContract({
          address: TRADE_HISTORY_CONTRACT_ADDRESS,
          abi: tradeHistoryAbi,
          functionName: "getUserTradeIds",
          args: [address]
        });

        const loadedRecords = await Promise.all(
          tradeIds.map(async (tradeId) => {
            const record = await publicClient.readContract({
              address: TRADE_HISTORY_CONTRACT_ADDRESS,
              abi: tradeHistoryAbi,
              functionName: "getTradeRecord",
              args: [tradeId]
            });

            return {
              tradeId,
              user: record.user,
              openTime: record.openTime,
              closedTime: record.closedTime,
              direction: record.direction,
              quantityDecimals: record.quantityDecimals,
              priceDecimals: record.priceDecimals,
              pnlDecimals: record.pnlDecimals,
              roiDecimals: record.roiDecimals,
              symbol: record.symbol,
              quantity: record.quantity,
              entryPrice: record.entryPrice,
              closingPrice: record.closingPrice,
              pnl: record.pnl,
              roi: record.roi
            } satisfies TradeRecord;
          })
        );

        if (!cancelled) {
          setRecords(loadedRecords.toReversed());
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load trade history");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTradeHistory();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected, isWrongChain, publicClient]);

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-normal text-white">
              Trade History
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Closed trades written on-chain by the backend writer wallet.
            </p>
          </div>
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          />
        </div>

        {!TRADE_HISTORY_CONTRACT_ADDRESS && (
          <div className="border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
            Missing NEXT_PUBLIC_TRADE_HISTORY_CONTRACT_ADDRESS.
          </div>
        )}

        {!isConnected && (
          <div className="border border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
            Connect your wallet to read your on-chain closed trade history.
          </div>
        )}

        {isWrongChain && (
          <div className="flex flex-col gap-3 border border-danger/50 bg-danger/10 px-4 py-4 text-sm text-danger md:flex-row md:items-center md:justify-between">
            <span>Switch your wallet to Sepolia to read this TradeHistory contract.</span>
            <button
              type="button"
              onClick={() => switchChain({ chainId: sepolia.id })}
              className="border border-danger/60 px-3 py-2 font-mono text-[10px] uppercase text-danger transition-colors hover:bg-danger/10"
            >
              Switch to Sepolia
            </button>
          </div>
        )}

        {isConnected && isLoading && (
          <div className="flex items-center gap-2 border border-border bg-surface px-4 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading on-chain trade history
          </div>
        )}

        {error && (
          <div className="border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {isConnected && !isLoading && records.length === 0 && !error && (
          <div className="border border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
            No on-chain closed trades found for this wallet.
          </div>
        )}

        {records.length > 0 && <TradeHistoryTable records={records} />}
      </div>
    </section>
  );
}

function TradeHistoryTable({ records }: { records: TradeRecord[] }) {
  return (
    <div className="overflow-x-auto border border-border bg-surface">
      <table className="w-full min-w-[1040px]">
        <thead>
          <tr className="border-b border-border font-mono text-[10px] uppercase text-muted-foreground">
            <th className="px-4 py-3 text-left">ID</th>
            <th className="px-4 py-3 text-left">Symbol</th>
            <th className="px-4 py-3 text-left">Direction</th>
            <th className="px-4 py-3 text-right">Quantity</th>
            <th className="px-4 py-3 text-right">Entry</th>
            <th className="px-4 py-3 text-right">Close</th>
            <th className="px-4 py-3 text-right">PnL</th>
            <th className="px-4 py-3 text-right">ROI</th>
            <th className="px-4 py-3 text-right">Opened</th>
            <th className="px-4 py-3 text-right">Closed</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const symbol = bytes32ToString(record.symbol);
            const isProfit = record.pnl >= 0n;

            return (
              <tr key={record.tradeId.toString()} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                  {record.tradeId.toString()}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-white">{symbol}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "border px-1.5 py-0.5 font-mono text-[10px] uppercase",
                      record.direction === 0
                        ? "border-success text-success"
                        : "border-danger text-danger"
                    )}
                  >
                    {record.direction === 0 ? "Long" : "Short"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm">
                  {formatQuantity(record.quantity, record.quantityDecimals, symbol)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                  {formatPrice(record.entryPrice, record.priceDecimals)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm">
                  {formatPrice(record.closingPrice, record.priceDecimals)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-mono text-sm",
                    isProfit ? "text-success" : "text-danger"
                  )}
                >
                  {formatPnl(record.pnl, record.pnlDecimals)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-mono text-sm",
                    record.roi >= 0n ? "text-success" : "text-danger"
                  )}
                >
                  {formatRoi(record.roi, record.roiDecimals)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                  {formatTimestamp(record.openTime)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                  {formatTimestamp(record.closedTime)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
