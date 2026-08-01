"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { TradePerformanceAnalysis } from "@/components/dashboard/trade-performance-analysis";
import { ensureTraderPortfolioApi, getTraderDashboardApi } from "@/lib/api/trader-dashboard-api";
import type { TraderDashboard } from "@/types/trader-dashboard";

export default function TradePerformancePage() {
  const { address } = useAccount();
  const [dashboard, setDashboard] = React.useState<TraderDashboard | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!address) { setDashboard(null); return; }
    setLoading(true);
    ensureTraderPortfolioApi(address)
      .then(() => getTraderDashboardApi(address))
      .then(setDashboard)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load performance"))
      .finally(() => setLoading(false));
  }, [address]);

  return <main className="min-h-screen bg-background"><div className="mx-auto max-w-[1400px] px-6 py-10">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-white"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
    <div className="mt-8"><div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">▎ Trading analytics</div><h1 className="mt-2 font-heading text-3xl font-bold">Trade performance</h1><p className="mt-2 text-sm text-muted-foreground">A detailed breakdown of strategy, markets, risk, and results.</p></div>
    <div className="mt-8">{dashboard ? <TradePerformanceAnalysis dashboard={dashboard} /> : <div className="border border-border bg-surface px-5 py-20 text-center text-sm text-muted-foreground">{loading ? "Loading performance…" : "Connect your wallet to view performance."}</div>}</div>
  </div></main>;
}
