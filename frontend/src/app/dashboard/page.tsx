'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ACTIVE_POSITIONS, RECENT_ACTIVITY, TRADERS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Pause, X } from 'lucide-react';
import { toast } from 'sonner';

const PORTFOLIO = {
  totalValue: 24840.21,
  pnl24h: 412.84,
  pnl24hPct: 1.69,
  margin: 8420,
  free: 16420.21,
  copyAllocated: 4200,
};

const COPIED = TRADERS.slice(0, 3).map((t, i) => ({
  trader: t,
  allocated: [2000, 1200, 1000][i],
  active: i !== 1,
  trades24h: [4, 0, 7][i],
}));

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

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
              style={{ fontFamily: 'var(--font-unbounded)' }}
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
              onClick={() => toast.info('Deposit', { description: 'Smart contract vault deposit modal would open here.' })}
              className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 font-medium hover:bg-neutral-200 text-sm"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Deposit
            </button>
            <button
              data-testid="withdraw-button"
              onClick={() => toast.info('Withdraw initiated')}
              className="inline-flex items-center gap-2 border border-border px-5 py-2.5 hover:border-border-focus text-sm"
            >
              <ArrowUpFromLine className="w-4 h-4" />
              Withdraw
            </button>
          </div>
        </div>

        {/* Top stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {[
            { label: 'Total Portfolio Value', value: `$${PORTFOLIO.totalValue.toLocaleString()}`, mono: true },
            {
              label: '24h PnL',
              value: `+$${PORTFOLIO.pnl24h.toFixed(2)} (+${PORTFOLIO.pnl24hPct}%)`,
              mono: true,
              accent: 'text-success',
            },
            { label: 'Margin Used', value: `$${PORTFOLIO.margin.toLocaleString()}`, mono: true },
            { label: 'Free Collateral', value: `$${PORTFOLIO.free.toLocaleString()}`, mono: true },
          ].map((s) => (
            <div key={s.label} className="bg-surface p-5">
              <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-2">
                {s.label}
              </div>
              <div className={cn('font-mono text-2xl', s.accent)}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active positions — 2 cols */}
          <div className="lg:col-span-2 bg-surface border border-border">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                ▎ Active Positions ({ACTIVE_POSITIONS.length})
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
                    <th className="text-left px-4 py-2.5">Pair</th>
                    <th className="text-left px-4 py-2.5">Side</th>
                    <th className="text-right px-4 py-2.5">Size</th>
                    <th className="text-right px-4 py-2.5">Entry</th>
                    <th className="text-right px-4 py-2.5">Mark</th>
                    <th className="text-right px-4 py-2.5">PnL</th>
                    <th className="text-right px-4 py-2.5">Source</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {ACTIVE_POSITIONS.map((p) => (
                    <tr key={p.id} className="border-b border-border hover:bg-surface-hover">
                      <td className="px-4 py-3 font-mono text-sm">{p.pair}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-[10px] font-mono uppercase px-1.5 py-0.5 border',
                            p.side === 'LONG' ? 'border-success text-success bg-success/10' : 'border-danger text-danger bg-danger/10'
                          )}
                        >
                          {p.side} · {p.leverage}×
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">${p.size.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">${p.entry.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm">${p.mark.toLocaleString()}</td>
                      <td className={cn('px-4 py-3 text-right font-mono text-sm', p.pnl >= 0 ? 'text-success' : 'text-danger')}>
                        {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)} ({p.pnlPct >= 0 ? '+' : ''}{p.pnlPct.toFixed(2)}%)
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        {p.copiedFrom ? `↻ ${p.copiedFrom}` : 'Manual'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          data-testid={`close-position-${p.id}`}
                          onClick={() => toast.success(`Position ${p.pair} close requested`)}
                          className="text-[10px] uppercase font-mono border border-border px-2 py-1 hover:border-danger hover:text-danger"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  {isConnected ? `${address?.slice(0, 6)}…${address?.slice(-4)}` : 'Not connected'}
                </div>
                <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                  {isConnected ? 'Sepolia Testnet' : 'Connect to view'}
                </div>
              </div>
            </div>
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-mono text-muted-foreground">USDC</span>
                <span className="font-mono text-sm">12,400.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-mono text-muted-foreground">ETH</span>
                <span className="font-mono text-sm">3.4521</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-mono text-muted-foreground">Copy Allocated</span>
                <span className="font-mono text-sm">$4,200</span>
              </div>
            </div>
          </div>
        </div>

        {/* Copied traders & activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface border border-border">
            <div className="px-5 py-3 border-b border-border">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                ▎ Copied Traders ({COPIED.length})
              </span>
            </div>
            <div>
              {COPIED.map((c) => (
                <div
                  key={c.trader.id}
                  className="px-5 py-4 border-b border-border last:border-0 flex items-center gap-4"
                  data-testid={`copied-trader-${c.trader.ens}`}
                >
                  <div className="w-10 h-10 overflow-hidden border border-border flex-shrink-0">
                    <img src={c.trader.avatar} alt={c.trader.ens} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{c.trader.ens}</span>
                      <span
                        className={cn(
                          'text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border',
                          c.active ? 'border-success text-success bg-success/10' : 'border-muted-foreground text-muted-foreground'
                        )}
                      >
                        {c.active ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">
                      ${c.allocated.toLocaleString()} allocated · {c.trades24h} trades today
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-success">+${(c.allocated * c.trader.roi30d / 100).toFixed(0)}</div>
                    <div className="text-[10px] uppercase font-mono text-muted-foreground">30D PnL</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      data-testid={`pause-${c.trader.ens}`}
                      onClick={() => toast.success(`${c.active ? 'Paused' : 'Resumed'} copying ${c.trader.ens}`)}
                      className="w-8 h-8 border border-border hover:border-border-focus flex items-center justify-center"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                    <button
                      data-testid={`stop-${c.trader.ens}`}
                      onClick={() => toast.success(`Stopped copying ${c.trader.ens}`)}
                      className="w-8 h-8 border border-border hover:border-danger hover:text-danger flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-border">
            <div className="px-5 py-3 border-b border-border">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                ▎ Recent Activity
              </span>
            </div>
            <div data-testid="activity-feed">
              {RECENT_ACTIVITY.map((a) => (
                <div key={a.id} className="px-5 py-3 border-b border-border last:border-0 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        'text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border',
                        a.type === 'COPY_OPEN'
                          ? 'border-accent text-accent'
                          : a.type === 'TRADE_CLOSE'
                          ? 'border-success text-success'
                          : a.type === 'DEPOSIT'
                          ? 'border-warning text-warning'
                          : 'border-border text-muted-foreground'
                      )}
                    >
                      {a.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">{a.time}</span>
                  </div>
                  <div className="mt-1.5 leading-relaxed">{a.detail}</div>
                  <div className="font-mono text-[10px] text-muted-foreground mt-1">
                    ↳ {a.trader} · <span className="text-accent">{a.tx}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
