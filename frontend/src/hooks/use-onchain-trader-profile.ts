"use client";

import * as React from "react";
import { formatUnits, isAddress, type Address, type Hex } from "viem";
import { usePublicClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { tradeHistoryAbi } from "@/lib/web3/trade-history/abi";
import { TRADE_HISTORY_CONTRACT_ADDRESS } from "@/lib/web3/trade-history/constants";
import { bytes32ToString } from "@/lib/web3/trade-history/format";
import { masterTraderRegistryReadAbi } from "@/lib/web3/master-registry/read-abi";
import { MASTER_REGISTRY_CONTRACT_ADDRESS } from "@/lib/web3/master-registry/constants";

const MASTER_ROI_DECIMALS = 4;
const MASTER_VOLUME_DECIMALS = 6;

export type OnChainTraderTrade = {
  tradeId: bigint;
  symbol: string;
  side: "LONG" | "SHORT";
  quantity: bigint;
  quantityDecimals: number;
  entryPrice: bigint;
  closingPrice: bigint;
  priceDecimals: number;
  pnl: bigint;
  pnlDecimals: number;
  roi: bigint;
  roiDecimals: number;
  openTime: bigint;
  closedTime: bigint;
  volumeUsd: number | null;
};

export type OnChainTraderProfile = {
  address: Address;
  verified: boolean | null;
  verifiedAt: bigint | null;
  verifiedBy: Address | null;
  verificationTotalTrades: bigint | null;
  verificationRoi: bigint | null;
  verificationTradingVolume: bigint | null;
  trades: OnChainTraderTrade[];
  totalTrades: number;
  totalPnl: number | null;
  averageRoi: number | null;
  winRate: number | null;
  tradingVolume: number | null;
  cumulativePnlSeries: { t: number; pnl: number }[];
};

export function useOnChainTraderProfile(addressParam: string | undefined) {
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const normalizedAddress = React.useMemo(() => {
    if (!addressParam || !isAddress(addressParam)) return null;
    return addressParam as Address;
  }, [addressParam]);
  const [profile, setProfile] = React.useState<OnChainTraderProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setProfile(null);
      setError(null);

      if (!normalizedAddress) {
        setError("Invalid trader address.");
        return;
      }

      if (!publicClient) {
        return;
      }

      if (!TRADE_HISTORY_CONTRACT_ADDRESS) {
        setError("Missing NEXT_PUBLIC_TRADE_HISTORY_CONTRACT_ADDRESS.");
        return;
      }

      setIsLoading(true);

      try {
        const [tradeIds, verification] = await Promise.all([
          publicClient.readContract({
            address: TRADE_HISTORY_CONTRACT_ADDRESS,
            abi: tradeHistoryAbi,
            functionName: "getUserTradeIds",
            args: [normalizedAddress],
          }),
          MASTER_REGISTRY_CONTRACT_ADDRESS
            ? publicClient.readContract({
                address: MASTER_REGISTRY_CONTRACT_ADDRESS,
                abi: masterTraderRegistryReadAbi,
                functionName: "getMasterVerification",
                args: [normalizedAddress],
              })
            : Promise.resolve(null),
        ]);

        const records = await Promise.all(
          tradeIds.map(async (tradeId) => {
            const record = await publicClient.readContract({
              address: TRADE_HISTORY_CONTRACT_ADDRESS,
              abi: tradeHistoryAbi,
              functionName: "getTradeRecord",
              args: [tradeId],
            });

            const symbol = bytes32ToString(record.symbol as Hex);
            const quantity = Number(formatUnits(record.quantity, record.quantityDecimals));
            const entryPrice = Number(formatUnits(record.entryPrice, record.priceDecimals));

            return {
              tradeId,
              symbol,
              side: record.direction === 0 ? "LONG" : "SHORT",
              quantity: record.quantity,
              quantityDecimals: record.quantityDecimals,
              entryPrice: record.entryPrice,
              closingPrice: record.closingPrice,
              priceDecimals: record.priceDecimals,
              pnl: record.pnl,
              pnlDecimals: record.pnlDecimals,
              roi: record.roi,
              roiDecimals: record.roiDecimals,
              openTime: record.openTime,
              closedTime: record.closedTime,
              volumeUsd: Number.isFinite(quantity) && Number.isFinite(entryPrice)
                ? quantity * entryPrice
                : null,
            } satisfies OnChainTraderTrade;
          })
        );

        const sortedRecords = [...records].sort((a, b) => Number(b.closedTime - a.closedTime));
        const totalPnl = sumSignedScaledValues(sortedRecords.map((record) => [record.pnl, record.pnlDecimals]));
        const averageRoi = sortedRecords.length
          ? sumSignedScaledValues(sortedRecords.map((record) => [record.roi, record.roiDecimals])) /
            sortedRecords.length
          : null;
        const wins = sortedRecords.filter((record) => record.pnl > 0n).length;
        const tradingVolume = sortedRecords.reduce<number | null>((total, record) => {
          if (total === null || record.volumeUsd === null) return null;
          return total + record.volumeUsd;
        }, 0);
        let cumulativePnl = 0;
        const cumulativePnlSeries = sortedRecords
          .slice()
          .sort((a, b) => Number(a.closedTime - b.closedTime))
          .map((record) => {
            cumulativePnl += signedScaledToNumber(record.pnl, record.pnlDecimals);
            return {
              t: Number(record.closedTime) * 1000,
              pnl: Number(cumulativePnl.toFixed(2)),
            };
          });

        if (!cancelled) {
          setProfile({
            address: normalizedAddress,
            verified: verification ? verification.verified : null,
            verifiedAt: verification && verification.verifiedAt > 0n ? verification.verifiedAt : null,
            verifiedBy: verification && verification.verifiedBy !== "0x0000000000000000000000000000000000000000"
              ? verification.verifiedBy
              : null,
            verificationTotalTrades: verification ? verification.totalTrades : null,
            verificationRoi: verification ? verification.roi : null,
            verificationTradingVolume: verification ? verification.tradingVolume : null,
            trades: sortedRecords,
            totalTrades: sortedRecords.length,
            totalPnl,
            averageRoi,
            winRate: sortedRecords.length ? (wins / sortedRecords.length) * 100 : null,
            tradingVolume,
            cumulativePnlSeries,
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load on-chain trader profile.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [normalizedAddress, publicClient]);

  return {
    profile,
    isLoading,
    error,
    invalidAddress: Boolean(addressParam && !normalizedAddress),
    missingMasterRegistryAddress: !MASTER_REGISTRY_CONTRACT_ADDRESS,
  };
}

export function formatMasterRoi(value: bigint | null): string {
  if (value === null) return "N/A";
  return `${formatSignedNumber(signedScaledToNumber(value, MASTER_ROI_DECIMALS))}%`;
}

export function formatMasterTradingVolume(value: bigint | null): string {
  if (value === null) return "N/A";
  return formatUsd(Number(formatUnits(value, MASTER_VOLUME_DECIMALS)));
}

export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `${formatSignedNumber(value)}%`;
}

export function formatUnsignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `${value.toFixed(2)}%`;
}

export function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function sumSignedScaledValues(values: Array<[bigint, number]>): number | null {
  if (values.length === 0) return null;

  return values.reduce((total, [value, decimals]) => {
    return total + signedScaledToNumber(value, decimals);
  }, 0);
}

function signedScaledToNumber(value: bigint, decimals: number): number {
  const sign = value < 0n ? -1 : 1;
  const absoluteValue = value < 0n ? -value : value;
  return sign * Number(formatUnits(absoluteValue, decimals));
}

function formatSignedNumber(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}
