'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Trader } from '@/lib/mock-data';
import { Shield, TrendingUp, TrendingDown, Users } from 'lucide-react';

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 30;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke={positive ? '#10B981' : '#F43F5E'}
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function TraderCard({ trader }: { trader: Trader }) {
  const positive = trader.roi30d >= 0;
  return (
    <Link
      href={`/traders/${trader.address}`}
      data-testid={`trader-card-${trader.ens}`}
      className="group block bg-surface border border-border hover:border-border-focus transition-colors p-5"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="relative w-12 h-12 overflow-hidden border border-border flex-shrink-0">
          <Image
            src={trader.avatar}
            alt={trader.ens}
            fill
            sizes="48px"
            className="object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm truncate">{trader.ens}</span>
            {trader.verified && (
              <Shield className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="#00E5FF" stroke="#000" strokeWidth={1.5} />
            )}
          </div>
          <div className="font-mono text-xs text-muted-foreground truncate">
            {trader.address.slice(0, 6)}…{trader.address.slice(-4)}
          </div>
          <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wider border border-border px-1.5 py-0.5 font-mono text-muted-foreground">
            {trader.style}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-end justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            30D ROI
          </span>
          <div
            className={cn(
              'font-mono text-2xl font-medium leading-none',
              positive ? 'text-success' : 'text-danger'
            )}
          >
            {positive ? '+' : ''}
            {trader.roi30d.toFixed(1)}%
          </div>
        </div>
        <Sparkline data={trader.sparkline} positive={positive} />
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Win
          </div>
          <div className="font-mono text-sm">{trader.winRate}%</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            AUM
          </div>
          <div className="font-mono text-sm">
            ${trader.aum >= 1e6 ? (trader.aum / 1e6).toFixed(1) + 'M' : (trader.aum / 1e3).toFixed(0) + 'K'}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Risk
          </div>
          <div
            className={cn(
              'font-mono text-sm',
              trader.riskScore <= 3
                ? 'text-success'
                : trader.riskScore <= 6
                ? 'text-warning'
                : 'text-danger'
            )}
          >
            {trader.riskScore}/10
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span className="font-mono">{trader.followers.toLocaleString()}</span>
        </div>
        <span className="text-xs font-mono uppercase tracking-wider text-accent group-hover:underline">
          View Profile →
        </span>
      </div>
    </Link>
  );
}
