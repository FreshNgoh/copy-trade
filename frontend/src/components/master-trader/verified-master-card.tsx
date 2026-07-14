"use client";

import * as React from "react";
import Link from "next/link";
import jazzicon from "@metamask/jazzicon";
import { ExternalLink, TrendingUp, Users } from "lucide-react";
import type { VerifiedMasterTrader } from "@/types/verified-master";

function formatUsd(value: number) {
  return `$${value.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

export function VerifiedMasterCard({
  trader,
}: {
  trader: VerifiedMasterTrader;
}) {
  const txUrl = trader.verificationTxHash
    ? `https://sepolia.etherscan.io/tx/${trader.verificationTxHash}`
    : null;

  return (
    <Link
      href={`/traders/${trader.traderWalletAddress}`}
      className="group block border border-border bg-surface p-5 transition-colors hover:border-border-focus"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
            <div className="flex items-center gap-2">
            <WalletAvatar address={trader.traderWalletAddress} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {trader.displayName}
              </div>
              <div className="truncate font-mono text-xs text-muted-foreground">
                {trader.traderWalletAddress}
              </div>
            </div>
          </div>
        </div>
        <span className="border border-accent bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-accent">
          Verified
        </span>
      </div>

      <div className="mb-4 border-y border-border py-4">
        <div className="flex items-end justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Master ROI
          </span>
          <span className="font-mono text-2xl text-success">
            {trader.roi >= 0 ? "+" : ""}
            {trader.roi.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Trades
          </div>
          <div className="font-mono text-sm">{trader.totalTrades}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Volume
          </div>
          <div className="font-mono text-sm">
            {formatUsd(trader.tradingVolume)}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Followers
          </div>
          <div className="flex items-center gap-1 font-mono text-sm">
            <Users className="h-3 w-3" aria-hidden="true" />
            {trader.followers.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" aria-hidden="true" />
          {trader.verifiedAt
            ? `Verified ${new Date(trader.verifiedAt).toLocaleDateString()}`
            : "Verified on-chain"}
        </span>
        {txUrl && (
          <span className="inline-flex items-center gap-1 font-mono text-xs text-accent group-hover:underline">
            Tx
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </span>
        )}
      </div>
    </Link>
  );
}

function WalletAvatar({ address }: { address: string }) {
  const avatarRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const container = avatarRef.current;
    if (!container) return;

    container.replaceChildren(jazzicon(40, getJazziconSeed(address)));
  }, [address]);

  return (
    <div
      ref={avatarRef}
      className="h-10 w-10 flex-shrink-0 overflow-hidden border border-border bg-background"
      aria-label={`Wallet avatar for ${address}`}
    />
  );
}

function getJazziconSeed(address: string) {
  return parseInt(address.slice(2, 10), 16);
}
