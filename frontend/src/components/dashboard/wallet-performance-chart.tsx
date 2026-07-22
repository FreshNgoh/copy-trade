"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TraderDashboard, TraderDashboardPosition } from "@/types/trader-dashboard";
import { cn } from "@/lib/utils";
import { BINANCE_TESTNET_BASE, SYMBOL_MAP } from "@/lib/trading/binance";

type Range = "1D" | "1W" | "1M";
type WalletView = "manual" | "copy";

const RANGE_MS: Record<Range, number> = {
  "1D": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
};

function isCopy(position: TraderDashboardPosition) {
  return position.trade_source === "COPY" || Boolean(position.copied_from_master);
}

function settledPnl(position: TraderDashboardPosition) {
  if (!isCopy(position)) return Number(position.Pnl ?? 0);
  return Number(position.follower_reward ?? position.Pnl ?? 0);
}

export function WalletPerformanceChart({ dashboard }: { dashboard: TraderDashboard }) {
  const [range, setRange] = React.useState<Range>("1W");
  const [wallet, setWallet] = React.useState<WalletView>("manual");
  const [markPrices, setMarkPrices] = React.useState<Record<string, number>>({});
  const symbols = React.useMemo(
    () => [...new Set(dashboard.activePositions.map((position) => position.symbol))],
    [dashboard.activePositions],
  );

  React.useEffect(() => {
    if (!symbols.length) {
      setMarkPrices({});
      return;
    }
    let cancelled = false;
    const loadPrices = async () => {
      const prices = await Promise.all(
        symbols.map(async (symbol) => {
          const ticker = SYMBOL_MAP[symbol];
          if (!ticker) return [symbol, 0] as const;
          try {
            const response = await fetch(`${BINANCE_TESTNET_BASE}/fapi/v1/ticker/price?symbol=${ticker}`);
            if (!response.ok) return [symbol, 0] as const;
            const data = await response.json();
            return [symbol, Number(data.price || 0)] as const;
          } catch {
            return [symbol, 0] as const;
          }
        }),
      );
      if (!cancelled) setMarkPrices(Object.fromEntries(prices));
    };
    loadPrices();
    const interval = window.setInterval(loadPrices, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [symbols]);

  const unrealizedPnl = React.useMemo(
    () => dashboard.activePositions
      .filter((position) => (wallet === "copy") === isCopy(position))
      .reduce((total, position) => {
        const markPrice = markPrices[position.symbol];
        if (!markPrice) return total + Number(position.Pnl ?? 0);
        const quantity = Number(position.quantity);
        const entryPrice = Number(position.entry_price);
        return total + (position.direction === "LONG"
          ? (markPrice - entryPrice) * quantity
          : (entryPrice - markPrice) * quantity);
      }, 0),
    [dashboard.activePositions, markPrices, wallet],
  );

  const data = React.useMemo(() => {
    const now = Date.now();
    const start = now - RANGE_MS[range];
    const events = dashboard.closedPositions
      .filter((position) => (wallet === "copy") === isCopy(position))
      .map((position) => ({
        time: new Date(position.updated_at || position.created_at).getTime(),
        pnl: settledPnl(position),
      }))
      .filter((event) => Number.isFinite(event.time) && event.time >= start && event.time <= now)
      .sort((a, b) => a.time - b.time);
    const walletBalance = wallet === "copy"
      ? dashboard.stats.copyWalletBalance
      : dashboard.stats.walletBalance;
    const endingValue = walletBalance + unrealizedPnl;
    const periodPnl = events.reduce((total, event) => total + event.pnl, 0);
    let value = walletBalance - periodPnl;
    const points = [{ time: start, value }];
    events.forEach((event) => {
      value += event.pnl;
      points.push({ time: event.time, value });
    });
    points.push({ time: now, value: endingValue });
    return points;
  }, [dashboard, range, unrealizedPnl, wallet]);

  const startValue = data[0]?.value ?? 0;
  const endValue = data[data.length - 1]?.value ?? 0;
  const change = endValue - startValue;

  return (
    <section className="border border-border bg-surface">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">▎ Wallet performance</div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-mono text-2xl">${endValue.toFixed(2)}</span>
            <span className={cn("font-mono text-xs", change >= 0 ? "text-success" : "text-danger")}>
              {change >= 0 ? "+" : "-"}${Math.abs(change).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex border border-border bg-background p-0.5">
            {(["manual", "copy"] as WalletView[]).map((item) => (
              <button key={item} type="button" onClick={() => setWallet(item)} className={cn("px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider", wallet === item ? "bg-white text-black" : "text-muted-foreground hover:text-white")}>{item}</button>
            ))}
          </div>
          <div className="flex border border-border bg-background p-0.5">
            {(["1D", "1W", "1M"] as Range[]).map((item) => (
              <button key={item} type="button" onClick={() => setRange(item)} className={cn("px-3 py-1.5 text-[10px] font-mono", range === item ? "bg-accent text-black" : "text-muted-foreground hover:text-white")}>{item}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="h-64 px-2 py-5" data-testid="wallet-performance-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 12, bottom: 0, left: 5 }}>
            <defs><linearGradient id="walletFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00E5FF" stopOpacity={0.24} /><stop offset="100%" stopColor="#00E5FF" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(value) => new Intl.DateTimeFormat(undefined, range === "1D" ? { hour: "numeric" } : { month: "short", day: "numeric" }).format(new Date(value))} stroke="#71717a" tickLine={false} axisLine={false} fontSize={10} minTickGap={40} />
            <YAxis tickFormatter={(value) => `$${Number(value).toFixed(2)}`} stroke="#71717a" tickLine={false} axisLine={false} fontSize={10} width={68} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "#0f0f11", border: "1px solid #27272a", borderRadius: 0, fontFamily: "monospace", fontSize: 12 }} labelFormatter={(value) => new Date(Number(value)).toLocaleString()} formatter={(value) => [`$${Number(value).toFixed(2)}`, `${wallet === "manual" ? "Manual" : "Copy"} wallet`]} />
            <Area type="monotone" dataKey="value" stroke="#00E5FF" strokeWidth={2} fill="url(#walletFill)" dot={false} activeDot={{ r: 4, fill: "#00E5FF", stroke: "#050505" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
