"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  bytes32ToString,
  formatScaledNumber,
} from "@/lib/web3/trade-history/format";
import type { OnChainTradeRecord } from "@/lib/web3/trade-history/types";
import { TRADE_HISTORY_CONTRACT_ADDRESS } from "@/lib/web3/trade-history/constants";

type View = "all" | "manual" | "copy";

function isCopy(record: OnChainTradeRecord) {
  return record.source !== 0;
}

function pnl(record: OnChainTradeRecord) {
  return Number(formatScaledNumber(record.pnl, record.pnlDecimals));
}

function roi(record: OnChainTradeRecord) {
  return Number(formatScaledNumber(record.roi, record.roiDecimals));
}

function symbol(record: OnChainTradeRecord) {
  return bytes32ToString(record.symbol);
}

function direction(record: OnChainTradeRecord) {
  return record.direction === 0 ? "LONG" : "SHORT";
}

function usd(value: number) {
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
}

export function TradePerformanceAnalysis({
  records,
  isLoading = false,
}: {
  records: OnChainTradeRecord[];
  isLoading?: boolean;
}) {
  const [view, setView] = React.useState<View>("all");
  const trades = React.useMemo(
    () => records.filter((trade) => view === "all" || (view === "copy") === isCopy(trade)),
    [records, view],
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
    const bySymbol = new Map<string, OnChainTradeRecord[]>();
    trades.forEach((trade) => {
      const tradeSymbol = symbol(trade);
      bySymbol.set(tradeSymbol, [...(bySymbol.get(tradeSymbol) ?? []), trade]);
    });
    const coins = [...bySymbol.entries()].map(([tradeSymbol, symbolTrades]) => {
      const symbolWins = symbolTrades.filter((trade) => pnl(trade) > 0).length;
      return {
        symbol: tradeSymbol,
        trades: symbolTrades.length,
        winRate: symbolTrades.length ? (symbolWins / symbolTrades.length) * 100 : 0,
        roi: symbolTrades.length ? symbolTrades.reduce((sum, trade) => sum + roi(trade), 0) / symbolTrades.length : 0,
        pnl: symbolTrades.reduce((sum, trade) => sum + pnl(trade), 0),
      };
    }).sort((a, b) => b.trades - a.trades);
    return {
      winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
      avgRoi: trades.length ? trades.reduce((sum, trade) => sum + roi(trade), 0) / trades.length : 0,
      netPnl: trades.reduce((sum, trade) => sum + pnl(trade), 0),
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      maxDrawdown,
      wins: wins.length,
      losses: losses.length,
      best: trades.reduce<OnChainTradeRecord | null>((best, trade) => !best || pnl(trade) > pnl(best) ? trade : best, null),
      worst: trades.reduce<OnChainTradeRecord | null>((worst, trade) => !worst || pnl(trade) < pnl(worst) ? trade : worst, null),
      longs: trades.filter((trade) => direction(trade) === "LONG").length,
      shorts: trades.filter((trade) => direction(trade) === "SHORT").length,
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
            <div><div className="text-[9px] font-mono uppercase text-muted-foreground">Best trade</div><div className="mt-1 flex justify-between gap-3"><span>{analysis.best ? symbol(analysis.best) : "—"}</span><span className="font-mono text-success">{analysis.best ? `+${usd(pnl(analysis.best))}` : "—"}</span></div></div>
            <div><div className="text-[9px] font-mono uppercase text-muted-foreground">Worst trade</div><div className="mt-1 flex justify-between gap-3"><span>{analysis.worst ? symbol(analysis.worst) : "—"}</span><span className="font-mono text-danger">{analysis.worst ? usd(pnl(analysis.worst)) : "—"}</span></div></div>
          </div>
        </section>
      </div>

      <section className="border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Closed trade breakdown</div>
          {TRADE_HISTORY_CONTRACT_ADDRESS && (
            <a
              href={`https://sepolia.etherscan.io/address/${TRADE_HISTORY_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[10px] uppercase tracking-wider text-accent hover:text-white"
            >
              View in Etherscan
            </a>
          )}
        </div>
        <div className="max-h-60 overflow-auto"><table className="w-full"><thead><tr className="border-b border-border text-[9px] font-mono uppercase tracking-wider text-muted-foreground"><th className="px-4 py-2.5 text-left">Block</th><th className="px-4 py-2.5 text-left">Market</th><th className="px-4 py-2.5 text-left">Direction</th><th className="px-4 py-2.5 text-left">Source</th><th className="px-4 py-2.5 text-right">ROI</th><th className="px-4 py-2.5 text-right">PnL</th></tr></thead><tbody>{trades.slice(0, 20).map((trade) => (
            <tr key={trade.tradeId.toString()} className="border-b border-border text-xs last:border-0">
              <td className="px-4 py-3 font-mono text-muted-foreground">{trade.blockNumber ? trade.blockNumber.toString() : "-"}</td>
              <td className="px-4 py-3 font-mono text-accent">{symbol(trade)}</td>
              <td className="px-4 py-3 font-mono">{direction(trade)}</td>
              <td className="px-4 py-3 text-muted-foreground">{isCopy(trade) ? "Copy" : "Manual"}</td>
              <td className={cn("px-4 py-3 text-right font-mono", roi(trade) >= 0 ? "text-success" : "text-danger")}>{roi(trade) >= 0 ? "+" : ""}{roi(trade).toFixed(2)}%</td>
              <td className={cn("px-4 py-3 text-right font-mono", pnl(trade) >= 0 ? "text-success" : "text-danger")}>{pnl(trade) >= 0 ? "+" : ""}{usd(pnl(trade))}</td>
            </tr>
          ))}</tbody></table>{isLoading && trades.length === 0 && <div className="px-4 py-10 text-center text-xs text-muted-foreground">Loading on-chain performance.</div>}</div>
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
