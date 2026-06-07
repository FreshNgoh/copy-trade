'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { TRADERS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Shield, Users, TrendingUp, Activity, Copy, ExternalLink, Twitter } from 'lucide-react';
import { CopySettingsModal } from '@/components/trader/copy-settings-modal';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { toast } from 'sonner';

export default function TraderProfilePage() {
  const params = useParams();
  const address = params.address as string;
  const trader = TRADERS.find((t) => t.address.toLowerCase() === address?.toLowerCase()) || TRADERS[0];
  const [copyOpen, setCopyOpen] = React.useState(false);

  const positive = trader.roi30d >= 0;

  return (
    <div data-testid="trader-profile-page" className="bg-background min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="bg-surface border border-border p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 overflow-hidden border border-border">
                <Image src={trader.avatar} alt="" fill sizes="80px" className="object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1
                    className="font-heading text-3xl lg:text-4xl font-bold tracking-tighter"
                    style={{ fontFamily: 'var(--font-unbounded)' }}
                  >
                    {trader.ens}
                  </h1>
                  {trader.verified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider border border-accent text-accent bg-accent/10 px-2 py-1">
                      <Shield className="w-3 h-3" fill="#00E5FF" stroke="#000" />
                      Verified
                    </span>
                  )}
                  <span className="text-[10px] font-mono uppercase tracking-wider border border-border px-2 py-1 text-muted-foreground">
                    {trader.style}
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(trader.address);
                    toast.success('Address copied');
                  }}
                  className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-white"
                >
                  {trader.address.slice(0, 8)}…{trader.address.slice(-6)}
                  <Copy className="w-3 h-3" />
                </button>
                <p className="text-sm text-muted-foreground mt-3 max-w-2xl leading-relaxed">{trader.bio}</p>
                <div className="flex gap-3 mt-3">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Twitter className="w-3 h-3" />@{trader.ens.split('.')[0]}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ExternalLink className="w-3 h-3" />
                    Etherscan
                  </span>
                </div>
              </div>
            </div>
            <button
              data-testid="copy-trader-cta"
              onClick={() => setCopyOpen(true)}
              className="w-full lg:w-auto bg-accent text-accent-foreground px-8 py-4 font-medium hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4" />
              Copy Trader
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-border mb-6">
          {[
            { l: '30D ROI', v: `${positive ? '+' : ''}${trader.roi30d}%`, c: positive ? 'text-success' : 'text-danger' },
            { l: 'All-Time ROI', v: `+${trader.roiAll}%`, c: 'text-success' },
            { l: 'Win Rate', v: `${trader.winRate}%` },
            { l: 'AUM', v: `$${(trader.aum / 1e6).toFixed(2)}M` },
            { l: 'Followers', v: trader.followers.toLocaleString() },
            { l: 'Total Trades', v: trader.totalTrades.toLocaleString() },
            { l: 'Max Drawdown', v: `-${trader.maxDrawdown}%`, c: 'text-danger' },
            { l: 'Risk Score', v: `${trader.riskScore}/10`, c: trader.riskScore <= 3 ? 'text-success' : trader.riskScore <= 6 ? 'text-warning' : 'text-danger' },
            { l: 'Total PnL', v: `+$${trader.totalPnl.toLocaleString()}`, c: 'text-success' },
            { l: 'Avg Hold', v: '14h' },
            { l: 'Sharpe', v: '2.41' },
            { l: 'Active Since', v: '2022' },
          ].map((s, i) => (
            <div key={i} className="bg-surface p-4">
              <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-1.5">{s.l}</div>
              <div className={cn('font-mono text-base', s.c)}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Chart + Trades */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface border border-border">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                ▎ Cumulative PnL · 90D
              </span>
              <span className={cn('font-mono text-lg', positive ? 'text-success' : 'text-danger')}>
                {positive ? '+' : ''}${trader.totalPnl.toLocaleString()}
              </span>
            </div>
            <div className="p-4" style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trader.perfSeries}>
                  <defs>
                    <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="t"
                    stroke="#52525B"
                    fontSize={10}
                    tick={{ fill: '#A1A1AA', fontFamily: 'JetBrains Mono' }}
                    tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    stroke="#52525B"
                    fontSize={10}
                    tick={{ fill: '#A1A1AA', fontFamily: 'JetBrains Mono' }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0F0F11',
                      border: '1px solid #27272A',
                      borderRadius: 0,
                      fontFamily: 'JetBrains Mono',
                      fontSize: 11,
                    }}
                    labelFormatter={(t) => new Date(t).toLocaleDateString()}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, 'PnL']}
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
            </div>
          </div>

          <div className="bg-surface border border-border">
            <div className="px-5 py-3 border-b border-border">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                ▎ Recent Activity
              </span>
            </div>
            <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
              {trader.recentTrades.slice(0, 8).map((tr) => (
                <div key={tr.id} className="p-3 hover:bg-surface-hover">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{tr.pair}</span>
                      <span
                        className={cn(
                          'text-[9px] font-mono uppercase px-1 py-0.5 border',
                          tr.side === 'LONG' ? 'border-success text-success' : 'border-danger text-danger'
                        )}
                      >
                        {tr.side} {tr.leverage}×
                      </span>
                    </div>
                    <span
                      className={cn('font-mono text-xs', tr.pnl >= 0 ? 'text-success' : 'text-danger')}
                    >
                      {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>{new Date(tr.timestamp).toLocaleString()}</span>
                    <span className="text-accent truncate max-w-[120px]">{tr.txHash.slice(0, 10)}…</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trade history table */}
        <div className="bg-surface border border-border mt-6">
          <div className="px-5 py-3 border-b border-border">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              ▎ Trade History (Reconstructed from on-chain events)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-2.5">Time</th>
                  <th className="text-left px-4 py-2.5">Pair</th>
                  <th className="text-left px-4 py-2.5">Side</th>
                  <th className="text-right px-4 py-2.5">Entry</th>
                  <th className="text-right px-4 py-2.5">Exit</th>
                  <th className="text-right px-4 py-2.5">Size</th>
                  <th className="text-right px-4 py-2.5">PnL</th>
                  <th className="text-right px-4 py-2.5">Tx</th>
                </tr>
              </thead>
              <tbody>
                {trader.recentTrades.map((tr) => (
                  <tr key={tr.id} className="border-b border-border hover:bg-surface-hover">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {new Date(tr.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm">{tr.pair}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          'text-[10px] font-mono uppercase px-1.5 py-0.5 border',
                          tr.side === 'LONG' ? 'border-success text-success' : 'border-danger text-danger'
                        )}
                      >
                        {tr.side} {tr.leverage}×
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">${tr.entry}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">${tr.exit?.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">${tr.size.toLocaleString()}</td>
                    <td className={cn('px-4 py-2.5 text-right font-mono text-sm', tr.pnl >= 0 ? 'text-success' : 'text-danger')}>
                      {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-accent truncate max-w-[120px]">
                      {tr.txHash.slice(0, 10)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CopySettingsModal open={copyOpen} onOpenChange={setCopyOpen} trader={trader} />
    </div>
  );
}
