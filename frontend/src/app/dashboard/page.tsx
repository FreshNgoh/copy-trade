"use client";

import * as React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { DepositUSDC } from "@/components/wallet/deposit-usdc";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  ensureTraderPortfolioApi,
  getTraderDashboardApi,
} from "@/lib/api/trader-dashboard-api";
import type {
  TraderDashboard,
  TraderDashboardActivity,
  TraderDashboardPosition,
} from "@/types/trader-dashboard";
import { cn } from "@/lib/utils";
import { Wallet, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";

const emptyDashboard: TraderDashboard = {
  trader_wallet_address: "",
  portfolio: null,
  stats: {
    totalPortfolioValue: 0,
    walletBalance: 0,
    realizedPnl: 0,
    marginUsed: 0,
    freeCollateral: 0,
    openPositionValue: 0,
    openPositionsCount: 0,
    openOrdersCount: 0,
    closedTradesCount: 0,
    followers: 0,
    winRate: 0,
    averageRoi: 0,
  },
  activePositions: [],
  closedPositions: [],
  openOrders: [],
  recentActivity: [],
};

function formatUsd(value: number) {
  const prefix = value < 0 ? "-$" : "$";

  return `${prefix}${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPositionNotional(position: TraderDashboardPosition) {
  return Number(position.entry_price) * Number(position.quantity);
}

function getPositionPnl(position: TraderDashboardPosition) {
  return Number(position.Pnl ?? 0);
}

function getActivityTone(activity: TraderDashboardActivity) {
  if (activity.type === "POSITION_CLOSE") return "border-success text-success";
  if (activity.type === "ORDER_OPEN") return "border-accent text-accent";
  return "border-border text-muted-foreground";
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [depositOpen, setDepositOpen] = React.useState(false);
  const [dashboard, setDashboard] =
    React.useState<TraderDashboard>(emptyDashboard);
  const [isLoading, setIsLoading] = React.useState(false);

  const loadDashboard = React.useCallback(async () => {
    if (!address) {
      setDashboard(emptyDashboard);
      return;
    }

    try {
      setIsLoading(true);
      await ensureTraderPortfolioApi(address);
      const data = await getTraderDashboardApi(address);
      setDashboard(data);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to fetch trader dashboard",
      );
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = dashboard.stats;

  return (
    <div data-testid="dashboard-page" className="bg-background min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-2">
              ▎ Portfolio
            </div>
            <h1
              className="font-heading text-3xl lg:text-5xl font-bold tracking-tighter"
              style={{ fontFamily: "var(--font-unbounded)" }}
            >
              Dashboard
            </h1>
            {isConnected && (
              <div className="font-mono text-xs text-muted-foreground mt-2">
                Vault: {address?.slice(0, 6)}…{address?.slice(-4)}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              data-testid="deposit-button"
              onClick={() => setDepositOpen(true)}
              className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 font-medium hover:bg-neutral-200 text-sm"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Deposit
            </button>
            <button
              data-testid="withdraw-button"
              onClick={() => toast.info("Withdraw initiated")}
              className="inline-flex items-center gap-2 border border-border px-5 py-2.5 hover:border-border-focus text-sm"
            >
              <ArrowUpFromLine className="w-4 h-4" />
              Withdraw
            </button>
          </div>
        </div>

        <Sheet open={depositOpen} onOpenChange={setDepositOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-[440px] p-0 bg-surface border-border text-white overflow-y-auto"
          >
            <DepositUSDC
              onSuccess={() => {
                setDepositOpen(false);
                loadDashboard();
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Top stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {[
            {
              label: "Total Portfolio Value",
              value: formatUsd(stats.totalPortfolioValue),
              mono: true,
            },
            {
              label: "Realized PnL",
              value: `${stats.realizedPnl >= 0 ? "+" : ""}${formatUsd(
                stats.realizedPnl,
              )}`,
              mono: true,
              accent: stats.realizedPnl >= 0 ? "text-success" : "text-danger",
            },
            {
              label: "Margin Used",
              value: formatUsd(stats.marginUsed),
              mono: true,
            },
            {
              label: "Free Collateral",
              value: formatUsd(stats.freeCollateral),
              mono: true,
            },
          ].map((s) => (
            <div key={s.label} className="bg-surface p-5">
              <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-2">
                {s.label}
              </div>
              <div className={cn("font-mono text-2xl", s.accent)}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active positions — 2 cols */}
          <div className="lg:col-span-2 bg-surface border border-border">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                ▎ Active Positions ({dashboard.activePositions.length})
              </span>
              <Link
                href="/trade"
                data-testid="dashboard-go-trade"
                className="text-[10px] uppercase tracking-wider font-mono text-accent hover:underline"
              >
                + New Trade
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="positions-table">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border">
                    <th className="text-left px-4 py-2.5">Symbol</th>
                    <th className="text-left px-4 py-2.5">Direction</th>
                    <th className="text-right px-4 py-2.5">Quantity</th>
                    <th className="text-right px-4 py-2.5">Entry</th>
                    <th className="text-right px-4 py-2.5">PnL</th>
                    <th className="text-right px-4 py-2.5">Source</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {dashboard.activePositions.map((p) => (
                    <tr
                      key={p.position_id}
                      className="border-b border-border hover:bg-surface-hover"
                    >
                      <td className="px-4 py-3 font-mono text-sm">
                        {p.symbol}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-[10px] font-mono uppercase px-1.5 py-0.5 border",
                            p.direction === "LONG"
                              ? "border-success text-success bg-success/10"
                              : "border-danger text-danger bg-danger/10",
                          )}
                        >
                          {p.direction} · {p.leverage}×
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {Number(p.quantity).toFixed(3)}
                        {" " + p.symbol.split("/")[0]}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                        {formatUsd(Number(p.entry_price))}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-mono text-sm",
                          getPositionPnl(p) >= 0
                            ? "text-success"
                            : "text-danger",
                        )}
                      >
                        {getPositionPnl(p) >= 0 ? "+" : ""}
                        {formatUsd(getPositionPnl(p))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        Manual
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          data-testid={`close-position-${p.position_id}`}
                          onClick={() =>
                            toast.success(
                              `Position ${p.symbol} close requested`,
                            )
                          }
                          className="text-[10px] uppercase font-mono border border-border px-2 py-1 hover:border-danger hover:text-danger"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isLoading && dashboard.activePositions.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No active positions.
                </div>
              )}
            </div>
          </div>

          {/* Wallet summary */}
          <div className="bg-surface border border-border p-5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-4">
              ▎ Vault
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-accent/10 border border-accent/30 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-accent" />
              </div>
              <div>
                <div className="font-mono text-sm">
                  {isConnected
                    ? `${address?.slice(0, 6)}…${address?.slice(-4)}`
                    : "Not connected"}
                </div>
                <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                  {isConnected ? "Sepolia Testnet" : "Connect to view"}
                </div>
              </div>
            </div>
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-mono text-muted-foreground">
                  USDC
                </span>
                <span className="font-mono text-sm">
                  {stats.walletBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-mono text-muted-foreground">
                  Positions
                </span>
                <span className="font-mono text-sm">
                  {stats.openPositionsCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-mono text-muted-foreground">
                  Followers
                </span>
                <span className="font-mono text-sm">
                  {stats.followers.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Trader stats & activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface border border-border">
            <div className="px-5 py-3 border-b border-border">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                ▎ Trader Performance
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
              {[
                {
                  label: "Followers",
                  value: stats.followers.toLocaleString(),
                },
                {
                  label: "Win Rate",
                  value: `${stats.winRate.toFixed(1)}%`,
                },
                {
                  label: "Avg ROI",
                  value: `${stats.averageRoi >= 0 ? "+" : ""}${stats.averageRoi.toFixed(2)}%`,
                  accent:
                    stats.averageRoi >= 0 ? "text-success" : "text-danger",
                },
                {
                  label: "Open Orders",
                  value: stats.openOrdersCount.toString(),
                },
              ].map((item) => (
                <div key={item.label} className="bg-surface p-5">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-2">
                    {item.label}
                  </div>
                  <div className={cn("font-mono text-xl", item.accent)}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-border text-xs text-muted-foreground">
              Dashboard data is loaded from your `portfolio`, `positions`, and
              `orders` tables.
            </div>
          </div>

          <div className="bg-surface border border-border">
            <div className="px-5 py-3 border-b border-border">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                ▎ Recent Activity
              </span>
            </div>
            <div data-testid="activity-feed">
              {dashboard.recentActivity.map((a) => (
                <div
                  key={a.id}
                  className="px-5 py-3 border-b border-border last:border-0 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border",
                        getActivityTone(a),
                      )}
                    >
                      {a.type.replace("_", " ")}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {formatDateTime(a.created_at)}
                    </span>
                  </div>
                  <div className="mt-1.5 leading-relaxed">{a.detail}</div>
                  <div className="font-mono text-[10px] text-muted-foreground mt-1">
                    {a.direction} ·{" "}
                    <span className="text-accent">{a.symbol}</span>
                  </div>
                </div>
              ))}
              {!isLoading && dashboard.recentActivity.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No recent activity.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
