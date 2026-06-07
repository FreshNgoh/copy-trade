'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';

export function TradePanel({ pair = 'ETH/USDC', midPrice = 3450 }: { pair?: string; midPrice?: number }) {
  const { isConnected } = useAccount();
  const [side, setSide] = React.useState<'BUY' | 'SELL'>('BUY');
  const [type, setType] = React.useState<'MARKET' | 'LIMIT' | 'STOP'>('MARKET');
  const [size, setSize] = React.useState('0.5');
  const [leverage, setLeverage] = React.useState([3]);
  const [stopLoss, setStopLoss] = React.useState('');
  const [takeProfit, setTakeProfit] = React.useState('');

  const cost = Number(size) * midPrice;
  const margin = cost / leverage[0];

  const handleSubmit = () => {
    if (!isConnected) {
      toast.error('Wallet not connected', { description: 'Connect a wallet to submit orders.' });
      return;
    }
    toast.success(`${side} ${size} ${pair.split('/')[0]} submitted`, {
      description: `${type} order · ${leverage[0]}x leverage · ~$${cost.toFixed(2)}`,
    });
  };

  return (
    <div data-testid="trade-panel" className="bg-surface border border-border h-full flex flex-col">
      {/* Buy / Sell tabs */}
      <div className="grid grid-cols-2 border-b border-border">
        <button
          data-testid="trade-side-buy"
          onClick={() => setSide('BUY')}
          className={cn(
            'py-3 text-sm font-medium font-mono uppercase tracking-wider transition-colors',
            side === 'BUY' ? 'bg-success/15 text-success border-b-2 border-success' : 'text-muted-foreground hover:text-white'
          )}
        >
          Buy / Long
        </button>
        <button
          data-testid="trade-side-sell"
          onClick={() => setSide('SELL')}
          className={cn(
            'py-3 text-sm font-medium font-mono uppercase tracking-wider transition-colors',
            side === 'SELL' ? 'bg-danger/15 text-danger border-b-2 border-danger' : 'text-muted-foreground hover:text-white'
          )}
        >
          Sell / Short
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Order type */}
        <div className="flex border border-border">
          {(['MARKET', 'LIMIT', 'STOP'] as const).map((t) => (
            <button
              key={t}
              data-testid={`order-type-${t.toLowerCase()}`}
              onClick={() => setType(t)}
              className={cn(
                'flex-1 py-1.5 text-[11px] font-mono uppercase tracking-wider transition-colors',
                type === t ? 'bg-white text-black' : 'text-muted-foreground hover:text-white'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Size */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Size
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">{pair.split('/')[0]}</span>
          </div>
          <input
            data-testid="trade-size-input"
            type="number"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-full bg-background border border-border focus:border-accent outline-none px-3 py-2 font-mono text-sm"
          />
          <div className="grid grid-cols-4 gap-1 mt-1.5">
            {['25%', '50%', '75%', 'MAX'].map((pct, i) => (
              <button
                key={pct}
                onClick={() => setSize(((i + 1) * 0.25 * 2).toFixed(2))}
                className="py-1 text-[10px] font-mono uppercase border border-border hover:border-border-focus text-muted-foreground hover:text-white transition-colors"
              >
                {pct}
              </button>
            ))}
          </div>
        </div>

        {/* Leverage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Leverage
            </span>
            <span className="font-mono text-sm">{leverage[0]}×</span>
          </div>
          <Slider
            data-testid="trade-leverage-slider"
            value={leverage}
            onValueChange={setLeverage}
            min={1}
            max={20}
            step={1}
          />
          <div className="grid grid-cols-5 gap-1 mt-2">
            {[1, 3, 5, 10, 20].map((l) => (
              <button
                key={l}
                onClick={() => setLeverage([l])}
                className={cn(
                  'py-1 text-[10px] font-mono border transition-colors',
                  leverage[0] === l ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted-foreground hover:border-border-focus'
                )}
              >
                {l}×
              </button>
            ))}
          </div>
        </div>

        {/* TP / SL */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Take Profit
            </span>
            <input
              data-testid="trade-tp-input"
              type="number"
              placeholder="—"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="w-full mt-1 bg-background border border-border focus:border-accent outline-none px-2 py-1.5 font-mono text-xs"
            />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Stop Loss
            </span>
            <input
              data-testid="trade-sl-input"
              type="number"
              placeholder="—"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full mt-1 bg-background border border-border focus:border-accent outline-none px-2 py-1.5 font-mono text-xs"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="pt-3 border-t border-border space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">Cost</span>
            <span className="font-mono">${cost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">Margin</span>
            <span className="font-mono">${margin.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">Fees (0.05%)</span>
            <span className="font-mono">${(cost * 0.0005).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <button
        data-testid="trade-submit-button"
        onClick={handleSubmit}
        className={cn(
          'w-full py-4 font-medium font-mono uppercase tracking-wider text-sm transition-all',
          side === 'BUY' ? 'bg-success text-white hover:brightness-110' : 'bg-danger text-white hover:brightness-110'
        )}
      >
        {side === 'BUY' ? 'Place Long Order' : 'Place Short Order'}
      </button>
    </div>
  );
}
