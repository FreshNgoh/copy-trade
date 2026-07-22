"use client";

import * as React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { getMasterFollowersApi } from "@/lib/api/master-followers-api";
import type { MasterFollowersSummary } from "@/types/master-follower";
import { cn } from "@/lib/utils";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatUsd(value: number) {
  const normalizedValue = Math.abs(value) < 0.005 ? 0 : value;
  return `${normalizedValue >= 0 ? "+" : "-"}$${Math.abs(normalizedValue).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function MasterFollowersPage() {
  const { address } = useAccount();
  const [data, setData] = React.useState<MasterFollowersSummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!address) {
      setData(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const result = await getMasterFollowersApi(address);
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load followers");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = window.setInterval(load, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [address]);

  const summary = [
    ["Total Followers", data?.totalFollowers.toLocaleString() ?? "—"],
    ["Active Followers", data?.activeFollowers.toLocaleString() ?? "—"],
    ["Active Allocation", data ? `$${data.totalAllocated.toFixed(2)}` : "—"],
    ["Master Profit Share", data ? formatUsd(data.totalMasterProfitShare) : "—"],
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">▎ Master analytics</div>
            <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight">Followers</h1>
            <p className="mt-2 text-sm text-muted-foreground">Follower duration, allocation, and profit sharing earned from successful copied trades.</p>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          {summary.map(([label, value]) => (
            <div key={label} className="bg-surface p-5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
              <div className="mt-2 font-mono text-xl">{value}</div>
            </div>
          ))}
        </div>

        {error && <div className="mt-6 border border-danger/50 bg-danger/10 p-4 text-sm text-danger">{error}</div>}

        <section className="mt-6 border border-border bg-surface">
          <div className="border-b border-border px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Follower details</div>
          {!loading && data?.followers.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground"><Users className="h-4 w-4" /> No followers yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead><tr className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 text-left">Follower</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-right">Following</th><th className="px-5 py-3 text-right">Allocation</th><th className="px-5 py-3 text-right">Copied Trades</th><th className="px-5 py-3 text-right">Open Positions</th><th className="px-5 py-3 text-right">Profit Share</th>
                </tr></thead>
                <tbody>{data?.followers.map((follower) => (
                  <tr key={follower.id} className="border-b border-border font-mono text-sm hover:bg-surface-hover">
                    <td className="px-5 py-4" title={follower.followerWalletAddress}>{shortAddress(follower.followerWalletAddress)}</td>
                    <td className="px-5 py-4"><span className={cn("border px-2 py-1 text-[10px] uppercase", follower.enabled ? "border-success text-success" : "border-warning text-warning")}>{follower.enabled ? "Active" : "Paused"}</span></td>
                    <td className="px-5 py-4 text-right">{follower.followedDays} day{follower.followedDays === 1 ? "" : "s"}</td>
                    <td className="px-5 py-4 text-right">${follower.maxCopyAmount.toFixed(2)}</td>
                    <td className="px-5 py-4 text-right">{follower.copiedTrades}</td>
                    <td className="px-5 py-4 text-right">{follower.activeCopiedPositions}</td>
                    <td className={cn("px-5 py-4 text-right", follower.masterProfitShare >= 0 ? "text-success" : "text-danger")}>{formatUsd(follower.masterProfitShare)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
