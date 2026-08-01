"use client";

import * as React from "react";
import type { TraderDashboard, TraderDashboardPosition } from "@/types/trader-dashboard";
import { cn } from "@/lib/utils";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type View = "all" | "manual" | "copy";

function isCopy(position: TraderDashboardPosition) {
  return (
    position.trade_source === "MASTER_COPY" ||
    position.trade_source === "COPY" ||
    Boolean(position.copied_from_master)
  );
}

function pnl(position: TraderDashboardPosition) {
  return isCopy(position)
    ? Number(position.follower_reward ?? position.Pnl ?? 0)
    : Number(position.Pnl ?? 0);
}

function usd(value: number) {
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
}

export function TradePerformanceAnalysis({ dashboard }: { dashboard: TraderDashboard }) {
  const [view, setView] = React.useState<View>("all");
  const trades = React.useMemo(
    () => dashboard.closedPositions.filter((trade) => view === "all" || (view === "copy") === isCopy(trade)),
    [dashboard.closedPositions, view],
  );

  const analysis = React.useMemo(() => {
    const wins = trades.filter((trade) => pnl(trade) > 0);
    const losses = trades.filter((trade) => pnl(trade) < 0);
    const grossProfit = wins.reduce((sum, trade) => sum + pnl(trade), 0);
    const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + pnl(trade), 0));
    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;
    [...trades].reverse().forEach((trade) => {
      equity += pnl(trade);
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
    });
    const bySymbol = new Map<string, TraderDashboardPosition[]>();
    trades.forEach((trade) => bySymbol.set(trade.symbol, [...(bySymbol.get(trade.symbol) ?? []), trade]));
    const coins = [...bySymbol.entries()].map(([symbol, symbolTrades]) => {
      const symbolWins = symbolTrades.filter((trade) => pnl(trade) > 0).length;
      return {
        symbol,
        trades: symbolTrades.length,
        winRate: symbolTrades.length ? (symbolWins / symbolTrades.length) * 100 : 0,
        roi: symbolTrades.length ? symbolTrades.reduce((sum, trade) => sum + Number(trade.Roi ?? 0), 0) / symbolTrades.length : 0,
        pnl: symbolTrades.reduce((sum, trade) => sum + pnl(trade), 0),
      };
    }).sort((a, b) => b.trades - a.trades);
    return {
      winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
      avgRoi: trades.length ? trades.reduce((sum, trade) => sum + Number(trade.Roi ?? 0), 0) / trades.length : 0,
      netPnl: trades.reduce((sum, trade) => sum + pnl(trade), 0),
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      maxDrawdown,
      wins: wins.length,
      losses: losses.length,
      best: trades.reduce<TraderDashboardPosition | null>((best, trade) => !best || pnl(trade) > pnl(best) ? trade : best, null),
      worst: trades.reduce<TraderDashboardPosition | null>((worst, trade) => !worst || pnl(trade) < pnl(worst) ? trade : worst, null),
      longs: trades.filter((trade) => trade.direction === "LONG").length,
      shorts: trades.filter((trade) => trade.direction === "SHORT").length,
      coins,
    };
  }, [trades]);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <div className="inline-flex border border-border bg-background p-0.5">
          {(["all", "manual", "copy"] as View[]).map((item) => <button key={item} type="button" onClick={() => setView(item)} className={cn("px-4 py-2 text-[10px] font-mono uppercase tracking-wider", view === item ? "bg-white text-black" : "text-muted-foreground hover:text-white")}>{item}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-6">
        {[
          ["Closed trades", trades.length.toString(), ""],
          ["Win rate", `${analysis.winRate.toFixed(1)}%`, analysis.winRate >= 50 ? "text-success" : "text-danger"],
          ["Average ROI", `${analysis.avgRoi >= 0 ? "+" : ""}${analysis.avgRoi.toFixed(2)}%`, analysis.avgRoi >= 0 ? "text-success" : "text-danger"],
          ["Net PnL", `${analysis.netPnl >= 0 ? "+" : ""}${usd(analysis.netPnl)}`, analysis.netPnl >= 0 ? "text-success" : "text-danger"],
          ["Profit factor", analysis.profitFactor === Infinity ? "∞" : analysis.profitFactor.toFixed(2), analysis.profitFactor >= 1 ? "text-success" : "text-danger"],
          ["Max drawdown", usd(-analysis.maxDrawdown), "text-danger"],
        ].map(([label, value, tone]) => <div key={label} className="bg-surface p-4"><div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div><div className={cn("mt-2 font-mono text-lg", tone)}>{value}</div></div>)}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="border border-border bg-surface lg:col-span-2">
          <div className="border-b border-border px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Performance by coin</div>
          <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-border text-[9px] font-mono uppercase tracking-wider text-muted-foreground"><th className="px-4 py-2.5">Market</th><th className="px-4 py-2.5 text-right">Trades</th><th className="px-4 py-2.5 text-right">Win rate</th><th className="px-4 py-2.5 text-right">Avg ROI</th><th className="px-4 py-2.5 text-right">PnL</th></tr></thead><tbody>{analysis.coins.map((coin) => <tr key={coin.symbol} className="border-b border-border last:border-0"><td className="px-4 py-3 font-mono text-xs text-accent">{coin.symbol}</td><td className="px-4 py-3 text-right font-mono text-xs">{coin.trades}</td><td className="px-4 py-3 text-right font-mono text-xs">{coin.winRate.toFixed(1)}%</td><td className={cn("px-4 py-3 text-right font-mono text-xs", coin.roi >= 0 ? "text-success" : "text-danger")}>{coin.roi >= 0 ? "+" : ""}{coin.roi.toFixed(2)}%</td><td className={cn("px-4 py-3 text-right font-mono text-xs", coin.pnl >= 0 ? "text-success" : "text-danger")}>{coin.pnl >= 0 ? "+" : ""}{usd(coin.pnl)}</td></tr>)}{analysis.coins.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-muted-foreground">No closed trades in this view.</td></tr>}</tbody></table></div>
        </section>
        <section className="border border-border bg-surface">
          <div className="border-b border-border px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Visual breakdown</div>
          <div className="grid grid-cols-2 gap-px bg-border">
            <PerformancePie title="Outcomes" data={[{ name: "Wins", value: analysis.wins, color: "#10b981" }, { name: "Losses", value: analysis.losses, color: "#f43f5e" }]} />
            <PerformancePie title="Direction" data={[{ name: "Long", value: analysis.longs, color: "#00e5ff" }, { name: "Short", value: analysis.shorts, color: "#f59e0b" }]} />
          </div>
          <div className="space-y-3 border-t border-border p-4 text-xs">
            <div><div className="text-[9px] font-mono uppercase text-muted-foreground">Best trade</div><div className="mt-1 flex justify-between gap-3"><span>{analysis.best?.symbol ?? "—"}</span><span className="font-mono text-success">{analysis.best ? `+${usd(pnl(analysis.best))}` : "—"}</span></div></div>
            <div><div className="text-[9px] font-mono uppercase text-muted-foreground">Worst trade</div><div className="mt-1 flex justify-between gap-3"><span>{analysis.worst?.symbol ?? "—"}</span><span className="font-mono text-danger">{analysis.worst ? usd(pnl(analysis.worst)) : "—"}</span></div></div>
          </div>
        </section>
      </div>

      <section className="border border-border bg-surface">
        <div className="border-b border-border px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Closed trade breakdown</div>
        <div className="max-h-60 overflow-auto"><table className="w-full"><tbody>{trades.slice(0, 20).map((trade) => <tr key={trade.position_id} className="border-b border-border text-xs last:border-0"><td className="px-4 py-3 font-mono text-accent">{trade.symbol}</td><td className="px-4 py-3 font-mono">{trade.direction}</td><td className="px-4 py-3 text-muted-foreground">{isCopy(trade) ? "Copy" : "Manual"}</td><td className={cn("px-4 py-3 text-right font-mono", Number(trade.Roi ?? 0) >= 0 ? "text-success" : "text-danger")}>{Number(trade.Roi ?? 0) >= 0 ? "+" : ""}{Number(trade.Roi ?? 0).toFixed(2)}%</td><td className={cn("px-4 py-3 text-right font-mono", pnl(trade) >= 0 ? "text-success" : "text-danger")}>{pnl(trade) >= 0 ? "+" : ""}{usd(pnl(trade))}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

function PerformancePie({ title, data }: { title: string; data: Array<{ name: string; value: number; color: string }> }) {
  const hasData = data.some((item) => item.value > 0);
  const chartData = hasData ? data : [{ name: "No data", value: 1, color: "#27272a" }];
  return <div className="bg-surface p-3"><div className="text-center text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{title}</div><div className="h-40">
    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} dataKey="value" nameKey="name" innerRadius={34} outerRadius={55} paddingAngle={hasData ? 3 : 0} stroke="none">{chartData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie>{hasData && <Tooltip contentStyle={{ background: "#0f0f11", border: "1px solid #27272a", borderRadius: 0, fontFamily: "monospace", fontSize: 11 }} />}{hasData && <Legend iconType="square" iconSize={7} wrapperStyle={{ fontSize: 9, fontFamily: "monospace" }} />}</PieChart></ResponsiveContainer>
  </div></div>;
}
