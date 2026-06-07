'use client';

import * as React from 'react';
import { TRADER_APPLICATIONS, PLATFORM_STATS, TRADERS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { AlertTriangle, Users, Activity, DollarSign, Shield, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';

const REVENUE_SERIES = Array.from({ length: 14 }, (_, i) => ({
  day: `Day ${i + 1}`,
  fees: 8000 + Math.round(Math.sin(i / 2) * 3000 + Math.random() * 4000),
  perf: 12000 + Math.round(Math.cos(i / 3) * 4000 + Math.random() * 5000),
}));

const FRAUD_ALERTS = [
  { id: 'f1', type: 'WASH_TRADE', wallet: '0x9a2b…44f1', detail: 'Self-trading pattern detected on ETH/USDC', severity: 'HIGH', time: '14m' },
  { id: 'f2', type: 'COORDINATED', wallet: '0x5e1f…88a2', detail: '4 related wallets trading identical positions', severity: 'MEDIUM', time: '2h' },
  { id: 'f3', type: 'PUMP', wallet: '0x771a…d4c2', detail: 'Anomalous volume spike on low-liq pair', severity: 'LOW', time: '5h' },
];

export default function AdminPage() {
  const [tab, setTab] = React.useState<'apps' | 'fraud' | 'revenue' | 'users'>('apps');

  return (
    <div data-testid="admin-page" className="bg-background min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-2">
              ▎ Operations
            </div>
            <h1
              className="font-heading text-3xl lg:text-5xl font-bold tracking-tighter"
              style={{ fontFamily: 'var(--font-unbounded)' }}
            >
              Admin Console
            </h1>
          </div>
          <div className="font-mono text-xs text-muted-foreground border border-border px-3 py-1.5">
            ROLE · MULTISIG GUARDIAN
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-border mb-6">
          {[
            { l: 'Total Volume', v: PLATFORM_STATS.totalVolume, icon: Activity },
            { l: 'TVL', v: PLATFORM_STATS.tvl, icon: DollarSign },
            { l: 'Active Traders', v: PLATFORM_STATS.activeTraders.toLocaleString(), icon: Users },
            { l: 'Total Followers', v: PLATFORM_STATS.totalFollowers.toLocaleString(), icon: Eye },
            { l: '24h Trades', v: PLATFORM_STATS.trades24h.toLocaleString(), icon: Shield },
          ].map((k) => (
            <div key={k.l} className="bg-surface p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{k.l}</span>
                <k.icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="font-mono text-2xl">{k.v}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-border flex mb-6">
          {(
            [
              { id: 'apps', label: `Trader Applications (${TRADER_APPLICATIONS.length})` },
              { id: 'fraud', label: `Fraud Alerts (${FRAUD_ALERTS.length})` },
              { id: 'revenue', label: 'Revenue & Fees' },
              { id: 'users', label: 'Users' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              data-testid={`admin-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-5 py-2.5 text-xs font-mono uppercase tracking-wider',
                tab === t.id ? 'text-white border-b-2 border-accent' : 'text-muted-foreground hover:text-white'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'apps' && (
          <div className="bg-surface border border-border">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border">
                  <th className="text-left px-5 py-3">Wallet</th>
                  <th className="text-right px-5 py-3">Win Rate</th>
                  <th className="text-right px-5 py-3">Trades</th>
                  <th className="text-right px-5 py-3">ROI</th>
                  <th className="text-right px-5 py-3">Risk</th>
                  <th className="text-left px-5 py-3">Submitted</th>
                  <th className="text-center px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {TRADER_APPLICATIONS.map((a) => (
                  <tr key={a.id} className="border-b border-border hover:bg-surface-hover">
                    <td className="px-5 py-3">
                      <div className="text-sm">{a.ens}</div>
                      <div className="font-mono text-xs text-muted-foreground">{a.address}</div>
                    </td>
                    <td className={cn('px-5 py-3 text-right font-mono text-sm', a.winRate >= 70 ? 'text-success' : 'text-danger')}>
                      {a.winRate}%
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm">{a.totalTrades}</td>
                    <td className={cn('px-5 py-3 text-right font-mono text-sm', a.roi >= 20 ? 'text-success' : 'text-danger')}>
                      +{a.roi}%
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm">{a.riskScore}/10</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{a.submitted}</td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={cn(
                          'inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-1 border',
                          a.status === 'APPROVED' && 'border-success text-success bg-success/10',
                          a.status === 'PENDING' && 'border-warning text-warning',
                          a.status === 'REJECTED' && 'border-danger text-danger'
                        )}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {a.status === 'PENDING' && (
                        <div className="flex gap-1 justify-end">
                          <button
                            data-testid={`approve-${a.id}`}
                            onClick={() => toast.success(`${a.ens} approved`)}
                            className="text-[10px] uppercase font-mono border border-success/40 text-success px-2 py-1 hover:bg-success hover:text-white transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            data-testid={`reject-${a.id}`}
                            onClick={() => toast.error(`${a.ens} rejected`)}
                            className="text-[10px] uppercase font-mono border border-danger/40 text-danger px-2 py-1 hover:bg-danger hover:text-white transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'fraud' && (
          <div className="space-y-3">
            {FRAUD_ALERTS.map((f) => (
              <div key={f.id} className="bg-surface border border-border p-5 flex items-start gap-4">
                <div
                  className={cn(
                    'w-10 h-10 border flex items-center justify-center flex-shrink-0',
                    f.severity === 'HIGH' ? 'border-danger bg-danger/10' : f.severity === 'MEDIUM' ? 'border-warning bg-warning/10' : 'border-border'
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      'w-5 h-5',
                      f.severity === 'HIGH' ? 'text-danger' : f.severity === 'MEDIUM' ? 'text-warning' : 'text-muted-foreground'
                    )}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{f.type.replace('_', ' ')}</span>
                    <span
                      className={cn(
                        'text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border',
                        f.severity === 'HIGH' ? 'border-danger text-danger' : f.severity === 'MEDIUM' ? 'border-warning text-warning' : 'border-border text-muted-foreground'
                      )}
                    >
                      {f.severity}
                    </span>
                    <span className="text-xs text-muted-foreground">· {f.time} ago</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">{f.detail}</div>
                  <div className="font-mono text-xs text-accent">{f.wallet}</div>
                </div>
                <div className="flex gap-1">
                  <button className="text-[10px] uppercase font-mono border border-border px-2 py-1 hover:border-border-focus">
                    Investigate
                  </button>
                  <button
                    onClick={() => toast.success('Wallet flagged')}
                    className="text-[10px] uppercase font-mono border border-danger/40 text-danger px-2 py-1 hover:bg-danger hover:text-white"
                  >
                    Flag
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'revenue' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface border border-border">
              <div className="px-5 py-3 border-b border-border">
                <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                  ▎ Revenue · 14D
                </span>
              </div>
              <div className="p-4" style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={REVENUE_SERIES}>
                    <CartesianGrid stroke="#1A1A1C" />
                    <XAxis dataKey="day" stroke="#52525B" fontSize={10} tick={{ fontFamily: 'JetBrains Mono' }} />
                    <YAxis stroke="#52525B" fontSize={10} tick={{ fontFamily: 'JetBrains Mono' }} />
                    <Tooltip
                      contentStyle={{
                        background: '#0F0F11',
                        border: '1px solid #27272A',
                        borderRadius: 0,
                        fontFamily: 'JetBrains Mono',
                        fontSize: 11,
                      }}
                    />
                    <Bar dataKey="fees" fill="#00E5FF" />
                    <Bar dataKey="perf" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { l: 'Trading Fees (24h)', v: '$8,420.21' },
                { l: 'Performance Fees (24h)', v: '$12,840.55' },
                { l: 'Subscription Revenue', v: '$2,420.00' },
                { l: 'Verification Fees', v: '$1,500.00' },
                { l: 'Total Revenue (24h)', v: '$25,180.76', highlight: true },
              ].map((r) => (
                <div
                  key={r.l}
                  className={cn(
                    'bg-surface border p-4 flex items-center justify-between',
                    r.highlight ? 'border-accent' : 'border-border'
                  )}
                >
                  <span className="text-sm text-muted-foreground">{r.l}</span>
                  <span className={cn('font-mono text-lg', r.highlight && 'text-accent')}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-surface border border-border">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border">
                  <th className="text-left px-5 py-3">Wallet</th>
                  <th className="text-left px-5 py-3">Role</th>
                  <th className="text-right px-5 py-3">Followers</th>
                  <th className="text-right px-5 py-3">AUM</th>
                  <th className="text-right px-5 py-3">PnL</th>
                  <th className="text-center px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {TRADERS.slice(0, 6).map((t) => (
                  <tr key={t.id} className="border-b border-border hover:bg-surface-hover">
                    <td className="px-5 py-3">
                      <div className="text-sm">{t.ens}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {t.address.slice(0, 8)}…{t.address.slice(-6)}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-accent text-accent">
                        Trader
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm">{t.followers.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-mono text-sm">${(t.aum / 1e6).toFixed(2)}M</td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-success">+${t.totalPnl.toLocaleString()}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-success text-success">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
