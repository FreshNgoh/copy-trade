"use client";

import * as React from "react";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import { MasterEligibilityButton } from "@/components/master-trader/master-eligibility-button";
import { VerifiedMasterCard } from "@/components/master-trader/verified-master-card";
import { cn } from "@/lib/utils";
import { useVerifiedMasterTraders } from "@/hooks/use-verified-master-traders";

export default function ExplorePage() {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<"roi" | "followers" | "volume" | "trades">("roi");
  const { data: verifiedTraders = [], error, isLoading, isFetching } = useVerifiedMasterTraders();

  const filtered = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const results = verifiedTraders.filter((trader) => {
      if (!normalizedSearch) return true;

      return (
        trader.traderWalletAddress.toLowerCase().includes(normalizedSearch) ||
        trader.displayName.toLowerCase().includes(normalizedSearch)
      );
    });

    return results.sort((a, b) =>
      sort === "roi"
        ? b.roi - a.roi
        : sort === "followers"
          ? b.followers - a.followers
          : sort === "volume"
            ? b.tradingVolume - a.tradingVolume
            : b.totalTrades - a.totalTrades,
    );
  }, [search, sort, verifiedTraders]);

  return (
    <div data-testid="explore-page" className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              ▎ Marketplace
            </div>
            <h1
              className="font-heading mb-3 text-3xl font-bold tracking-tighter lg:text-5xl"
              style={{ fontFamily: "var(--font-unbounded)" }}
            >
              Explore Traders
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              Browse verified master traders from the portfolio database. Each
              listing is filtered by verified master status.
            </p>
          </div>

          <MasterEligibilityButton />
        </div>

        <div className="mb-4 flex min-h-5 items-center justify-between">
          <div className="font-mono text-sm text-muted-foreground">
            {isLoading
              ? "Loading verified masters"
              : `${filtered.length} verified masters`}
          </div>
          {isFetching && !isLoading && (
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Refreshing
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 items-start gap-6">
          <aside className="col-span-12 lg:col-span-3">
            <div className="sticky top-20 border border-border bg-surface p-4">
              <div className="mb-4 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-accent" />
                <span className="font-mono text-[10px] uppercase tracking-wider">
                  Filters
                </span>
              </div>

              <div className="mb-5">
                <div className="flex items-center border border-border bg-background focus-within:border-accent">
                  <Search className="mx-3 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    data-testid="explore-search"
                    type="text"
                    placeholder="Address"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="flex-1 bg-transparent py-2 font-mono text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Sort By
                </div>
                <select
                  data-testid="sort-select"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as typeof sort)}
                  className="w-full border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus:border-accent"
                >
                  <option value="roi">Master ROI</option>
                  <option value="volume">Trading Volume</option>
                  <option value="trades">Total Trades</option>
                  <option value="followers">Followers</option>
                </select>
              </div>
            </div>
          </aside>

          <div className="col-span-12 lg:col-span-9">
            {error && (
              <div className="border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error.message}
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center gap-2 border border-border bg-surface py-20 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading verified master traders
              </div>
            )}

            {!isLoading && !error && filtered.length === 0 && (
              <div
                className={cn(
                  "border border-dashed border-border py-20 text-center text-muted-foreground",
                  verifiedTraders.length === 0 && "bg-surface",
                )}
              >
                {verifiedTraders.length === 0
                  ? "No verified master traders yet."
                  : "No verified master traders match your search."}
              </div>
            )}

            {filtered.length > 0 && (
              <div
                className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                data-testid="trader-grid"
              >
                {filtered.map((trader) => (
                  <VerifiedMasterCard
                    key={trader.traderId}
                    trader={trader}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
