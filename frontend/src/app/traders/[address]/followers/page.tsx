"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { getMasterFollowersApi } from "@/lib/api/master-followers-api";
import type { MasterFollowersSummary } from "@/types/master-follower";
import { cn } from "@/lib/utils";
import { WalletAvatar } from "@/components/wallet/wallet-avatar";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatEarnings(value: number) {
  const normalizedValue = Math.abs(value) < 0.005 ? 0 : value;
  return `${normalizedValue >= 0 ? "+" : "-"}$${Math.abs(normalizedValue).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PublicMasterFollowersPage() {
  const params = useParams<{ address?: string | string[] }>();
  const address = Array.isArray(params.address) ? params.address[0] : params.address;
  const [data, setData] = React.useState<MasterFollowersSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!address) return;

    const load = async () => {
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

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href={`/traders/${address ?? ""}`}
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Trader profile
        </Link>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">▎ Public performance</div>
            <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight">Follower Results</h1>
            <p className="mt-2 text-sm text-muted-foreground">How long followers have copied this master and their realized earnings.</p>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {error && <div className="mt-6 border border-danger/50 bg-danger/10 p-4 text-sm text-danger">{error}</div>}

        <section className="mt-8 border border-border bg-surface">
          {!loading && data?.followers.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground"><Users className="h-4 w-4" /> No follower results yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {data?.followers.map((follower) => (
                <div key={follower.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-8 px-5 py-4 hover:bg-surface-hover">
                  <div>
                    <div className="flex items-center gap-3">
                      <WalletAvatar
                        address={follower.followerWalletAddress}
                        size={36}
                        className="shrink-0 overflow-hidden border border-border bg-background"
                      />
                      <div>
                        <div className="font-mono text-sm">{shortAddress(follower.followerWalletAddress)}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">{follower.enabled ? "Active" : "Paused"}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right"><div className="font-mono text-[10px] uppercase text-muted-foreground">Following</div><div className="mt-1 font-mono text-sm">{follower.followedDays} day{follower.followedDays === 1 ? "" : "s"}</div></div>
                  <div className="min-w-28 text-right"><div className="font-mono text-[10px] uppercase text-muted-foreground">Earned</div><div className={cn("mt-1 font-mono text-sm", follower.realizedEarnings >= 0 ? "text-success" : "text-danger")}>{formatEarnings(follower.realizedEarnings)}</div></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
