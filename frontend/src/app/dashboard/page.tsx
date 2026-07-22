"use client";

import * as React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { DepositUSDC } from "@/components/wallet/deposit-usdc";
import { WithdrawUSDC } from "@/components/wallet/withdraw-usdc";
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
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import { WalletPerformanceChart } from "@/components/dashboard/wallet-performance-chart";

const emptyDashboard: TraderDashboard = {
  trader_wallet_address: "",
  portfolio: null,
  stats: {
    totalPortfolioValue: 0,
    walletBalance: 0,
    copyWalletBalance: 0,
    totalWalletBalance: 0,
    realizedPnl: 0,
    marginUsed: 0,
    manualMarginUsed: 0,
    copyMarginUsed: 0,
    freeCollateral: 0,
    copyFreeCollateral: 0,
    openPositionValue: 0,
    openPositionsCount: 0,
    openOrdersCount: 0,
    closedTradesCount: 0,
    followers: 0,
    winRate: 0,
    averageRoi: 0,
    manualPerformance: {
      closedTradesCount: 0,
      openPositionsCount: 0,
      realizedPnl: 0,
      grossPnl: 0,
      masterRewards: 0,
      followerRewards: 0,
      winRate: 0,
      averageRoi: 0,
    },
    copyPerformance: {
      closedTradesCount: 0,
      openPositionsCount: 0,
      realizedPnl: 0,
      grossPnl: 0,
      masterRewards: 0,
      followerRewards: 0,
      winRate: 0,
      averageRoi: 0,
    },
    allPerformance: {
      closedTradesCount: 0,
      openPositionsCount: 0,
      realizedPnl: 0,
      grossPnl: 0,
      masterRewards: 0,
      followerRewards: 0,
      winRate: 0,
      averageRoi: 0,
    },
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

function shortAddress(address?: string | null) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getPositionNotional(position: TraderDashboardPosition) {
  return Number(position.entry_price) * Number(position.quantity);
}

function getPositionSourceLabel(position: TraderDashboardPosition) {
  if (position.trade_source === "COPY" || position.copied_from_master) {
    return `Copied ${shortAddress(position.copied_from_master)}`;
  }

  return "Manual";
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
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
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
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/transfer"
              data-testid="transfer-button"
              className="inline-flex items-center gap-2 border border-accent/50 px-5 py-2.5 text-sm text-accent hover:bg-accent/10"
            >
              Transfer
            </Link>
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
              onClick={() => setWithdrawOpen(true)}
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

        <Sheet open={withdrawOpen} onOpenChange={setWithdrawOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-[440px] p-0 bg-surface border-border text-white overflow-y-auto"
          >
            <WithdrawUSDC
              onSuccess={() => {
                setWithdrawOpen(false);
                loadDashboard();
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Top stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {(
            [
              {
                label: "Total Wallet Value",
                value: formatUsd(stats.totalPortfolioValue),
                mono: true,
              },
              {
                label: "Manual Wallet",
                value: formatUsd(stats.walletBalance),
                mono: true,
              },
              {
                label: "Copy Wallet",
                value: formatUsd(stats.copyWalletBalance),
                mono: true,
              },
              {
                label: "Realized PnL",
                value: `${stats.realizedPnl >= 0 ? "+" : ""}${formatUsd(stats.realizedPnl)}`,
                mono: true,
                accent: stats.realizedPnl >= 0 ? "text-success" : "text-danger",
                action: true,
              },
            ] as Array<{
              label: string;
              value: string;
              mono: boolean;
              accent?: string;
              action?: boolean;
            }>
          ).map((s) => {
            const content = (
              <>
                <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-2">
                  {s.label}
                </div>
                <div className={cn("font-mono text-2xl", s.accent)}>
                  {s.value}
                </div>
                {s.action && (
                  <div className="mt-2 text-[9px] font-mono uppercase tracking-wider text-accent opacity-70 group-hover:opacity-100">
                    Open analytics →
                  </div>
                )}
              </>
            );
            return s.action ? (
              <Link
                key={s.label}
                href="/dashboard/performance"
                className="group bg-surface p-5 text-left hover:bg-surface-hover"
              >
                {content}
              </Link>
            ) : (
              <div key={s.label} className="bg-surface p-5 text-left">
                {content}
              </div>
            );
          })}
        </div>

        <WalletPerformanceChart dashboard={dashboard} />

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
                        {getPositionSourceLabel(p)}
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
