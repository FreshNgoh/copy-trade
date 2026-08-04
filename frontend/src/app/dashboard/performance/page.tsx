"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAccount, usePublicClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { toast } from "sonner";
import { TradePerformanceAnalysis } from "@/components/dashboard/trade-performance-analysis";
import { readUserTradeHistoryRecords } from "@/lib/web3/trade-history/client";
import { TRADE_HISTORY_CONTRACT_ADDRESS } from "@/lib/web3/trade-history/constants";
import type { OnChainTradeRecord } from "@/lib/web3/trade-history/types";
import { masterTraderRegistryReadAbi } from "@/lib/web3/master-registry/read-abi";
import { MASTER_REGISTRY_CONTRACT_ADDRESS } from "@/lib/web3/master-registry/constants";
import { getTraderDashboardApi } from "@/lib/api/trader-dashboard-api";
import { getClosedPositionsApi } from "@/lib/api/position-api";
import { applyTradeHistorySourceOverrides } from "@/lib/web3/trade-history/source";

function dateToUnixSeconds(value?: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? BigInt(Math.floor(timestamp / 1000)) : null;
}

export default function TradePerformancePage() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const [records, setRecords] = React.useState<OnChainTradeRecord[]>([]);
  const [verifiedAt, setVerifiedAt] = React.useState<bigint | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function loadPerformance() {
      if (!address || !publicClient || !TRADE_HISTORY_CONTRACT_ADDRESS) {
        setRecords([]);
        setVerifiedAt(null);
        return;
      }

      setLoading(true);

      try {
        const [loadedRecords, verification, dashboardResult, closedPositions] = await Promise.all([
          readUserTradeHistoryRecords({
            publicClient,
            user: address,
          }),
          MASTER_REGISTRY_CONTRACT_ADDRESS
            ? publicClient.readContract({
                address: MASTER_REGISTRY_CONTRACT_ADDRESS,
                abi: masterTraderRegistryReadAbi,
                functionName: "getMasterVerification",
                args: [address],
              })
            : Promise.resolve(null),
          getTraderDashboardApi(address).catch(() => null),
          getClosedPositionsApi(address).catch(() => []),
        ]);

        if (!cancelled) {
          setRecords(
            applyTradeHistorySourceOverrides(
              loadedRecords,
              closedPositions,
            ).toReversed(),
          );
          setVerifiedAt(
            verification && verification.verified && verification.verifiedAt > 0n
              ? verification.verifiedAt
              : dateToUnixSeconds(dashboardResult?.portfolio?.master_verified_at),
          );
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load on-chain performance",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPerformance();

    return () => {
      cancelled = true;
    };
  }, [address, publicClient]);

  return <main className="min-h-screen bg-background"><div className="mx-auto max-w-[1400px] px-6 py-10">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-white"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
    <div className="mt-8"><div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">▎ Trading analytics</div><h1 className="mt-2 font-heading text-3xl font-bold">Trade performance</h1><p className="mt-2 text-sm text-muted-foreground">A detailed breakdown of on-chain strategy, markets, risk, and results.</p></div>
    <div className="mt-8">{address ? <TradePerformanceAnalysis records={records} isLoading={loading} verifiedAt={verifiedAt} /> : <div className="border border-border bg-surface px-5 py-20 text-center text-sm text-muted-foreground">Connect your wallet to view performance.</div>}</div>
  </div></main>;
}
