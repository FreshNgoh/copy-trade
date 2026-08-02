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

export default function TradePerformancePage() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const [records, setRecords] = React.useState<OnChainTradeRecord[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function loadPerformance() {
      if (!address || !publicClient || !TRADE_HISTORY_CONTRACT_ADDRESS) {
        setRecords([]);
        return;
      }

      setLoading(true);

      try {
        const loadedRecords = await readUserTradeHistoryRecords({
          publicClient,
          user: address,
        });

        if (!cancelled) {
          setRecords(loadedRecords.toReversed());
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
    <div className="mt-8">{address ? <TradePerformanceAnalysis records={records} isLoading={loading} /> : <div className="border border-border bg-surface px-5 py-20 text-center text-sm text-muted-foreground">Connect your wallet to view performance.</div>}</div>
  </div></main>;
}
