"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";
import type { VerifiedMasterTrader } from "@/types/verified-master";
import { WalletAvatar } from "@/components/wallet/wallet-avatar";

function formatUsd(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function VerifiedMasterCard({
  trader,
}: {
  trader: VerifiedMasterTrader;
}) {
  const positive = trader.roi >= 0;

  return (
    <Link
      href={`/traders/${trader.traderWalletAddress}`}
      className="group block border border-border bg-surface p-5 transition-colors hover:border-border-focus hover:bg-surface-hover"
    >
      <div className="flex items-start gap-3">
        <WalletAvatar
          address={trader.traderWalletAddress}
          size={48}
          className="shrink-0 overflow-hidden border border-border bg-background"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">
              {trader.displayName}
            </span>
            <ShieldCheck
              className="h-4 w-4 shrink-0 text-accent"
              fill="#00E5FF"
              stroke="#050505"
            />
          </div>
          <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {trader.traderWalletAddress}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Master ROI
          </span>
          <span
            className={`font-mono text-3xl ${positive ? "text-success" : "text-danger"}`}
          >
            {positive ? "+" : ""}
            {trader.roi.toFixed(2)}%
          </span>
        </div>
        <RoiSparkline values={trader.roiHistory} positive={positive} />
      </div>

      <div className="grid grid-cols-3 gap-3 border-y border-border py-4">
        <Metric label="Win rate" value={`${trader.winRate.toFixed(2)}%`} />
        <Metric label="Volume" value={formatUsd(trader.tradingVolume)} />
        <Metric label="Trades" value={trader.totalTrades.toLocaleString()} />
      </div>

      <div className="flex items-center justify-between pt-4">
        <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Users className="h-4 w-4" /> {trader.followers.toLocaleString()}
        </span>
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-accent">
          View profile
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 font-mono text-sm">{value}</div>
    </div>
  );
}

function RoiSparkline({
  values,
  positive,
}: {
  values: number[];
  positive: boolean;
}) {
  const points = values.length > 0 ? [0, ...values] : [0, 0];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coordinates = points
    .map((value, index) => {
      const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100;
      const y = 24 - ((value - min) / range) * 20;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      className="mt-3 h-12 w-full"
      aria-hidden="true"
    >
      <line
        x1="0"
        y1="26"
        x2="100"
        y2="26"
        stroke="#27272a"
        strokeWidth="0.6"
      />
      <polyline
        points={coordinates}
        fill="none"
        stroke={positive ? "#10b981" : "#f43f5e"}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
