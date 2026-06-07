'use client';

import * as React from 'react';
import { CandlestickChart } from '@/components/trading/candlestick-chart';
import { OrderBook } from '@/components/trading/order-book';
import { TradePanel } from '@/components/trading/trade-panel';
import { ACTIVE_POSITIONS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const PAIRS = [
  { pair: 'ETH/USDC', price: 3489.21, change: 2.41, vol: '$842M' },
  { pair: 'BTC/USDC', price: 67455.0, change: 0.95, vol: '$2.1B' },
  { pair: 'SOL/USDC', price: 188.1, change: -1.18, vol: '$320M' },
  { pair: 'ARB/USDC', price: 0.79, change: -5.95, vol: '$54M' },
  { pair: 'PEPE/USDC', price: 0.000018, change: 12.4, vol: '$92M' },
  { pair: 'LINK/USDC', price: 15.84, change: 3.2, vol: '$78M' },
];

export default function TradePage() {
  const [activePair, setActivePair] = React.useState(PAIRS[0]);
  const [tab, setTab] = React.useState<'positions' | 'orders' | 'history'>('positions');

  return (
    <div data-testid="trade-page" className="bg-background min-h-screen pb-8">
      <div className="max-w-[1600px] mx-auto px-4 pt-4">
        {/* Pair selector / ticker */}
        <div className="bg-surface border border-border overflow-x-auto">
          <div className="flex items-stretch divide-x divide-border min-w-max">
            {PAIRS.map((p) => (
              <button
                key={p.pair}
                data-testid={`pair-${p.pair}`}
                onClick={() => setActivePair(p)}
                className={cn(
                  'px-5 py-3 text-left transition-colors min-w-[160px]',
                  activePair.pair === p.pair ? 'bg-background border-b-2 border-accent' : 'hover:bg-surface-hover'
                )}
              >
                <div className="font-mono text-xs text-muted-foreground">{p.pair}</div>
                <div className="font-mono text-sm mt-0.5">
                  ${p.price < 1 ? p.price.toFixed(6) : p.price.toLocaleString()}
                </div>
                <div className={cn('font-mono text-[10px] mt-0.5', p.change >= 0 ? 'text-success' : 'text-danger')}>
                  {p.change >= 0 ? '+' : ''}
                  {p.change}%
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Header bar */}
        <div className="bg-surface border-x border-b border-border px-5 py-3 flex flex-wrap items-center gap-6">
          <div>
            <div className="font-heading text-xl font-bold tracking-tighter">{activePair.pair}</div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[10px] uppercase font-mono text-muted-foreground">Price</div>
              <div className={cn('font-mono text-lg', activePair.change >= 0 ? 'text-success' : 'text-danger')}>
                ${activePair.price < 1 ? activePair.price.toFixed(6) : activePair.price.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-muted-foreground">24h Change</div>
              <div className={cn('font-mono text-sm', activePair.change >= 0 ? 'text-success' : 'text-danger')}>
                {activePair.change >= 0 ? '+' : ''}
                {activePair.change}%
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-muted-foreground">24h Volume</div>
              <div className="font-mono text-sm">{activePair.vol}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-muted-foreground">Funding</div>
              <div className="font-mono text-sm text-success">+0.012%</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-muted-foreground">Open Interest</div>
              <div className="font-mono text-sm">$184.2M</div>
            </div>
          </div>
        </div>

        {/* Grid: Chart | OrderBook | TradePanel */}
        <div className="grid grid-cols-12 gap-2 mt-2">
          <div className="col-span-12 lg:col-span-7 bg-surface border border-border">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <div className="flex gap-1">
                {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf, i) => (
                  <button
                    key={tf}
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-mono uppercase',
                      i === 3 ? 'bg-white text-black' : 'text-muted-foreground hover:text-white'
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 text-[10px] font-mono text-muted-foreground uppercase">
                <span>MA</span>
                <span>EMA</span>
                <span>RSI</span>
                <span>VOL</span>
              </div>
            </div>
            <CandlestickChart pair={activePair.pair} />
          </div>
          <div className="col-span-6 lg:col-span-2">
            <OrderBook midPrice={activePair.price} />
          </div>
          <div className="col-span-6 lg:col-span-3">
            <TradePanel pair={activePair.pair} midPrice={activePair.price} />
          </div>
        </div>

        {/* Bottom panel */}
        <div className="bg-surface border border-border mt-2">
          <div className="flex border-b border-border">
            {(
              [
                { id: 'positions', label: `Positions (${ACTIVE_POSITIONS.length})` },
                { id: 'orders', label: 'Open Orders (0)' },
                { id: 'history', label: 'Trade History' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                data-testid={`bottom-tab-${t.id}`}
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

          {tab === 'positions' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border">
                    <th className="text-left px-4 py-2">Pair</th>
                    <th className="text-left px-4 py-2">Side</th>
                    <th className="text-right px-4 py-2">Size</th>
                    <th className="text-right px-4 py-2">Entry</th>
                    <th className="text-right px-4 py-2">Mark</th>
                    <th className="text-right px-4 py-2">Liq Price</th>
                    <th className="text-right px-4 py-2">PnL</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {ACTIVE_POSITIONS.map((p) => (
                    <tr key={p.id} className="border-b border-border hover:bg-surface-hover">
                      <td className="px-4 py-2.5 font-mono text-sm">{p.pair}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            'text-[10px] font-mono uppercase px-1.5 py-0.5 border',
                            p.side === 'LONG' ? 'border-success text-success' : 'border-danger text-danger'
                          )}
                        >
                          {p.side} {p.leverage}×
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">${p.size.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">${p.entry.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">${p.mark.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-warning">${p.liquidation.toLocaleString()}</td>
                      <td className={cn('px-4 py-2.5 text-right font-mono text-sm', p.pnl >= 0 ? 'text-success' : 'text-danger')}>
                        {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button className="text-[10px] uppercase font-mono border border-border px-2 py-1 hover:border-danger hover:text-danger">
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'orders' && (
            <div className="py-16 text-center text-muted-foreground font-mono text-sm">No open orders</div>
          )}
          {tab === 'history' && (
            <div className="py-16 text-center text-muted-foreground font-mono text-sm">
              Trade history is being reconstructed from on-chain events...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
