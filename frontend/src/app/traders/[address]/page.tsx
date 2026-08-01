"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Shield,
  Activity,
  Copy,
  ExternalLink,
  Twitter,
  Loader2,
  RefreshCcw,
  ChevronRight,
} from "lucide-react";
import { CopySettingsModal } from "@/components/trader/copy-settings-modal";
import { WalletAvatar } from "@/components/wallet/wallet-avatar";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import {
  formatPercent,
  formatUnsignedPercent,
  formatUsd,
  useOnChainTraderProfile,
} from "@/hooks/use-onchain-trader-profile";
import {
  formatPnl,
  formatPrice,
  formatQuantity,
  formatRoi,
  formatTimestamp,
} from "@/lib/web3/trade-history/format";
import { getTraderDashboardApi } from "@/lib/api/trader-dashboard-api";
import type { TraderDashboardPosition } from "@/types/trader-dashboard";

const notAvailable = "N/A";

export default function TraderProfilePage() {
  const params = useParams<{ address?: string | string[] }>();
  const address = Array.isArray(params.address)
    ? params.address[0]
    : params.address;
  const [copyOpen, setCopyOpen] = React.useState(false);
  const [followers, setFollowers] = React.useState<number | null>(null);
  const [tradingCapital, setTradingCapital] = React.useState<number | null>(null);
  const [masterCopyPositions, setMasterCopyPositions] = React.useState<
    TraderDashboardPosition[]
  >([]);
  const {
    profile,
    isLoading,
    error,
    invalidAddress,
    missingMasterRegistryAddress,
  } = useOnChainTraderProfile(address);

  const traderAddress =
    profile?.address ??
    (!invalidAddress ? (address as `0x${string}` | undefined) : undefined);
  const displayName = traderAddress
    ? shortAddress(traderAddress)
    : notAvailable;
  const verified = profile?.verified === true;
  const totalPnlPositive =
    profile?.totalPnl === null ||
    profile?.totalPnl === undefined ||
    profile.totalPnl >= 0;
  React.useEffect(() => {
    let cancelled = false;

    if (!traderAddress) {
      setFollowers(null);
      setTradingCapital(null);
      setMasterCopyPositions([]);
      return;
    }

    const loadDashboard = async () => {
      const [dashboardResult] = await Promise.allSettled([
        getTraderDashboardApi(traderAddress),
      ]);
      if (cancelled) return;

      if (dashboardResult.status === "fulfilled") {
        const dashboard = dashboardResult.value;
          setFollowers(dashboard.stats.followers);
          setTradingCapital(dashboard.stats.copyWalletBalance);
          setMasterCopyPositions(
            dashboard.activePositions.filter(
              (position) => position.trade_source === "MASTER_COPY",
            ),
          );
      } else {
          setFollowers(null);
          setTradingCapital(null);
          setMasterCopyPositions([]);
      }

    };

    loadDashboard();
    const interval = window.setInterval(loadDashboard, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [traderAddress]);

  const maxDrawdownPercent =
    tradingCapital !== null &&
    tradingCapital > 0 &&
    profile?.maxDrawdown !== null &&
    profile?.maxDrawdown !== undefined
      ? (profile.maxDrawdown / tradingCapital) * 100
      : null;

  const stats = [
    {
      l: "30D ROI",
      v: formatPercent(profile?.thirtyDayRoi ?? null),
      c: getSignedClass(formatPercent(profile?.thirtyDayRoi ?? null)),
    },
    { l: "Win Rate", v: formatUnsignedPercent(profile?.winRate ?? null) },
    { l: "AUM", v: formatUsd(tradingCapital) },
    {
      l: "Followers",
      v: followers === null ? notAvailable : followers.toLocaleString(),
    },
    {
      l: "Total Trades",
      v: profile ? profile.totalTrades.toLocaleString() : notAvailable,
    },
    {
      l: "Max Drawdown",
      v: formatUnsignedPercent(maxDrawdownPercent),
      c: maxDrawdownPercent === null ? undefined : "text-danger",
    },
    {
      l: "Total PnL",
      v: formatUsd(profile?.totalPnl ?? null),
      c:
        profile?.totalPnl === null || profile?.totalPnl === undefined
          ? undefined
          : profile.totalPnl >= 0
            ? "text-success"
            : "text-danger",
    },
    {
      l: "Verified At",
      v: profile?.verifiedAt
        ? formatTimestamp(profile.verifiedAt)
        : notAvailable,
    },
  ];

  return (
    <div
      data-testid="trader-profile-page"
      className="bg-background min-h-screen"
    >
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="bg-surface border border-border p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div className="flex items-center gap-5">
              <WalletAvatar
                address={
                  traderAddress ?? "0x0000000000000000000000000000000000000000"
                }
                size={80}
                className="relative flex-shrink-0 overflow-hidden border border-border bg-background"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1
                    className="font-heading text-3xl lg:text-4xl font-bold tracking-tighter"
                    style={{ fontFamily: "var(--font-unbounded)" }}
                  >
                    {displayName}
                  </h1>
                  {verified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider border border-accent text-accent bg-accent/10 px-2 py-1">
                      <Shield
                        className="w-3 h-3"
                        fill="#00E5FF"
                        stroke="#000"
                      />
                      Verified
                    </span>
                  )}
                  <span className="text-[10px] font-mono uppercase tracking-wider border border-border px-2 py-1 text-muted-foreground">
                    On-Chain Profile
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!traderAddress) return;
                    navigator.clipboard.writeText(traderAddress);
                    toast.success("Address copied");
                  }}
                  disabled={!traderAddress}
                  className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {traderAddress
                    ? `${traderAddress.slice(0, 8)}...${traderAddress.slice(-6)}`
                    : notAvailable}
                  <Copy className="w-3 h-3" />
                </button>
                <p className="text-sm text-muted-foreground mt-3 max-w-2xl leading-relaxed">
                  On-chain verified master trader profile. Fields not stored in
                  the smart contracts are shown as {notAvailable}.
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Twitter className="w-3 h-3" />
                    {notAvailable}
                  </span>
                  {traderAddress ? (
                    <a
                      href={`https://sepolia.etherscan.io/address/${traderAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Etherscan
                    </a>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ExternalLink className="w-3 h-3" />
                      {notAvailable}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              data-testid="copy-trader-cta"
              onClick={() => setCopyOpen(true)}
              disabled={!traderAddress || invalidAddress}
              className="w-full lg:w-auto bg-accent text-accent-foreground px-8 py-4 font-medium hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Activity className="w-4 h-4" />
              Copy Trader
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="mb-6 flex items-center gap-2 border border-border bg-surface px-4 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading on-chain trader data from Sepolia
          </div>
        )}

        {missingMasterRegistryAddress && (
          <div className="mb-6 border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning">
            Missing NEXT_PUBLIC_MASTER_REGISTRY_CONTRACT_ADDRESS. Verification
            fields will show {notAvailable}.
          </div>
        )}

        {error && (
          <div className="mb-6 border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-6">
          {stats.map((s) => (
            s.l === "Followers" && traderAddress ? (
            <Link
              key={s.l}
              href={`/traders/${traderAddress}/followers`}
              className="group bg-surface p-4 hover:bg-surface-hover"
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-1.5">
                {s.l}
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </div>
              <div className={cn("font-mono text-base", s.c)}>{s.v}</div>
            </Link>
            ) : (
            <div key={s.l} className="bg-surface p-4">
              <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-1.5">
                {s.l}
              </div>
              <div className={cn("font-mono text-base", s.c)}>{s.v}</div>
            </div>
            )
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface border border-border">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Cumulative PnL
              </span>
              <span
                className={cn(
                  "font-mono text-lg",
                  totalPnlPositive ? "text-success" : "text-danger",
                )}
              >
                {formatUsd(profile?.totalPnl ?? null)}
              </span>
            </div>
            <div className="p-4" style={{ height: 360 }}>
              {profile && profile.cumulativePnlSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={profile.cumulativePnlSeries}>
                    <defs>
                      <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#00E5FF"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="100%"
                          stopColor="#00E5FF"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="t"
                      stroke="#52525B"
                      fontSize={10}
                      tick={{ fill: "#A1A1AA", fontFamily: "JetBrains Mono" }}
                      tickFormatter={(t) =>
                        new Date(t).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      stroke="#52525B"
                      fontSize={10}
                      tick={{ fill: "#A1A1AA", fontFamily: "JetBrains Mono" }}
                      tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0F0F11",
                        border: "1px solid #27272A",
                        borderRadius: 0,
                        fontFamily: "JetBrains Mono",
                        fontSize: 11,
                      }}
                      labelFormatter={(t) =>
                        new Date(Number(t)).toLocaleDateString()
                      }
                      formatter={(v: number) => [formatUsd(v), "PnL"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="pnl"
                      stroke="#00E5FF"
                      strokeWidth={2}
                      fill="url(#pnlGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center font-mono text-sm text-muted-foreground">
                  {isLoading ? "Loading..." : notAvailable}
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface border border-border">
            <div className="px-5 py-3 border-b border-border">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Master Copy Active Positions
              </span>
            </div>
            <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
              {masterCopyPositions.length > 0 ? (
                masterCopyPositions.map((position) => (
                  <div
                    key={position.position_id}
                    className="p-3 hover:bg-surface-hover"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">
                          {position.symbol || notAvailable}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-mono uppercase px-1 py-0.5 border",
                            position.direction === "LONG"
                              ? "border-success text-success"
                              : "border-danger text-danger",
                          )}
                        >
                          {position.direction} {position.leverage}×
                        </span>
                      </div>
                      <span className="font-mono text-xs text-accent">
                        {Number(position.quantity).toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })}{" "}
                        {position.symbol.split("/")[0]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>{new Date(position.created_at).toLocaleString()}</span>
                      <span>Entry ${Number(position.entry_price).toFixed(2)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <RefreshCcw className="h-4 w-4" />
                  No active Master Copy positions.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border mt-6">
          <div className="px-5 py-3 border-b border-border">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Trade History
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-2.5">Closed Time</th>
                  <th className="text-left px-4 py-2.5">Symbol</th>
                  <th className="text-left px-4 py-2.5">Direction</th>
                  <th className="text-right px-4 py-2.5">Entry Price</th>
                  <th className="text-right px-4 py-2.5">Closing Price</th>
                  <th className="text-right px-4 py-2.5">Quantity</th>
                  <th className="text-right px-4 py-2.5">PnL</th>
                  <th className="text-right px-4 py-2.5">ROI</th>
                  <th className="text-right px-4 py-2.5">Tx</th>
                </tr>
              </thead>
              <tbody>
                {profile && profile.trades.length > 0 ? (
                  profile.trades.map((trade) => (
                    <tr
                      key={trade.tradeId.toString()}
                      className="border-b border-border hover:bg-surface-hover"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {formatTimestamp(trade.closedTime)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm">
                        {trade.symbol || notAvailable}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "text-[10px] font-mono uppercase px-1.5 py-0.5 border",
                            trade.side === "LONG"
                              ? "border-success text-success"
                              : "border-danger text-danger",
                          )}
                        >
                          {trade.side}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">
                        {formatPrice(trade.entryPrice, trade.priceDecimals)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">
                        {formatPrice(trade.closingPrice, trade.priceDecimals)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">
                        {formatQuantity(
                          trade.quantity,
                          trade.quantityDecimals,
                          trade.symbol,
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-mono text-sm",
                          trade.pnl >= 0n ? "text-success" : "text-danger",
                        )}
                      >
                        {formatPnl(trade.pnl, trade.pnlDecimals)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-mono text-sm",
                          trade.roi >= 0n ? "text-success" : "text-danger",
                        )}
                      >
                        {formatRoi(trade.roi, trade.roiDecimals)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                        {notAvailable}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center font-mono text-sm text-muted-foreground"
                    >
                      {isLoading
                        ? "Loading on-chain trade history..."
                        : "No on-chain trade history found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {traderAddress && (
        <CopySettingsModal
          open={copyOpen}
          onOpenChange={setCopyOpen}
          trader={{
            address: traderAddress,
            ens: displayName,
            avatar: null,
            verified,
          }}
        />
      )}
    </div>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getSignedClass(value: string) {
  if (value === notAvailable) return undefined;
  return value.startsWith("-") ? "text-danger" : "text-success";
}
