"use client";

import Link from "next/link";
import Image from "next/image";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ArrowRight, Shield, Zap, Eye, Lock, Loader2 } from "lucide-react";
import { VerifiedMasterCard } from "@/components/master-trader/verified-master-card";
import { WalletAvatar } from "@/components/wallet/wallet-avatar";
import { useVerifiedMasterTraders } from "@/hooks/use-verified-master-traders";
import { useMarketTickers } from "@/hooks/use-market-tickers";

export default function LandingPage() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const marketTickers = useMarketTickers();
  const { data: verifiedTraders = [], isLoading } = useVerifiedMasterTraders();
  const topTraders = [...verifiedTraders]
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 4);
  const leader = topTraders[0];
  const totalVolume = verifiedTraders.reduce(
    (sum, trader) => sum + trader.tradingVolume,
    0,
  );
  const totalValue = verifiedTraders.reduce(
    (sum, trader) => sum + trader.walletBalance,
    0,
  );
  const averageRoi = verifiedTraders.length
    ? verifiedTraders.reduce((sum, trader) => sum + trader.roi, 0) /
      verifiedTraders.length
    : 0;
  const formatUsd = (value: number) =>
    `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div data-testid="landing-page" className="bg-background overflow-hidden">
      {/* Ticker */}
      <div className="border-b border-border bg-surface overflow-hidden">
        <div className="flex marquee whitespace-nowrap py-2.5">
          {[...marketTickers, ...marketTickers].map((ticker, index) => (
            <div
              key={`${ticker.pair}-${index}`}
              className="inline-flex items-center gap-3 px-6 font-mono text-xs"
            >
              <span className="text-muted-foreground">{ticker.pair}</span>
              <span>
                ${ticker.price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className={ticker.change >= 0 ? "text-success" : "text-danger"}>
                {ticker.change >= 0 ? "+" : ""}{ticker.change.toFixed(2)}%
              </span>
              <span className="text-border">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="relative min-h-[88vh] flex items-center bg-grid">
        <div className="absolute inset-0 hero-blob opacity-60 pointer-events-none" />
        <div className="absolute inset-0 bg-noise pointer-events-none" />
        <Image
          src="https://images.pexels.com/photos/30766684/pexels-photo-30766684.png"
          alt=""
          fill
          className="object-cover opacity-[0.08] pointer-events-none mix-blend-screen"
          priority
        />

        <div className="relative max-w-[1600px] mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 w-full">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 border border-border px-3 py-1 mb-8">
              <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Live on Sepolia · Mainnet in Q2
              </span>
            </div>

            <h1
              className="font-heading text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tighter leading-[0.9] mb-6"
              style={{ fontFamily: "var(--font-unbounded)" }}
            >
              Copy the alphas.
              <br />
              <span className="text-accent">Trust the code.</span>
            </h1>

            <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10">
              The first fully decentralized, non-custodial copy trading
              terminal. Follow top-performing wallets automatically. Every trade
              is a smart contract event. Your funds never leave your vault.
            </p>

            <div className="flex flex-wrap gap-3 mb-12">
              <button
                data-testid="hero-connect-cta"
                onClick={() => (isConnected ? null : openConnectModal?.())}
                className="group inline-flex items-center gap-2 bg-white text-black px-7 py-3.5 font-medium hover:bg-neutral-200 transition-colors"
              >
                {isConnected ? "Wallet Connected" : "Connect Wallet"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <Link
                href="/explore"
                data-testid="hero-explore-cta"
                className="inline-flex items-center gap-2 border border-border px-7 py-3.5 hover:border-border-focus transition-colors"
              >
                Explore Traders
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Inline stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border max-w-2xl">
              {[
                { label: "Total Volume", value: formatUsd(totalVolume) },
                {
                  label: "Active Traders",
                  value: verifiedTraders.length.toLocaleString(),
                },
                {
                  label: "Avg ROI",
                  value: `${averageRoi >= 0 ? "+" : ""}${averageRoi.toFixed(2)}%`,
                  accent: averageRoi >= 0 ? "text-success" : "text-danger",
                },
                { label: "Trader Balance", value: formatUsd(totalValue) },
              ].map((s) => (
                <div key={s.label} className="bg-background p-4">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-1.5">
                    {s.label}
                  </div>
                  <div className={`font-mono text-xl ${s.accent || ""}`}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — Top Trader Spotlight */}
          <div className="lg:col-span-4 lg:pl-8 lg:border-l border-border flex flex-col gap-4">
            <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">
              ▎ Verified master leader
            </div>
            {leader ? (
              <Link
                href={`/traders/${leader.traderWalletAddress}`}
                className="block bg-surface border border-border p-5 hover:border-accent transition-colors"
              >
              <div className="flex items-center gap-3 mb-4">
                <WalletAvatar address={leader.traderWalletAddress} size={56} className="overflow-hidden border border-border" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{leader.displayName}</span>
                    <Shield
                      className="w-4 h-4 text-accent"
                      fill="#00E5FF"
                      stroke="#000"
                    />
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {leader.traderWalletAddress.slice(0, 6)}…
                    {leader.traderWalletAddress.slice(-4)}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                    Master ROI
                  </span>
                  <span className={`font-mono text-4xl font-medium ${leader.roi >= 0 ? "text-success" : "text-danger"}`}>
                    {leader.roi >= 0 ? "+" : ""}{leader.roi.toFixed(2)}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                  <div>
                    <div className="text-[10px] uppercase font-mono text-muted-foreground">
                      Win Rate
                    </div>
                    <div className="font-mono">{leader.winRate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono text-muted-foreground">
                      Volume
                    </div>
                    <div className="font-mono">
                      {formatUsd(leader.tradingVolume)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono text-muted-foreground">
                      Followers
                    </div>
                    <div className="font-mono">
                      {leader.followers.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              </Link>
            ) : (
              <div className="flex min-h-52 items-center justify-center border border-border bg-surface p-5 text-sm text-muted-foreground">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading leader</> : "No verified master traders yet."}
              </div>
            )}
            <Link
              href="/explore"
              className="inline-flex items-center justify-between border border-border p-4 hover:border-border-focus group"
            >
              <span className="text-sm">See all {verifiedTraders.length.toLocaleString()} verified traders</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works — asymmetric bento */}
      <section className="relative border-t border-border">
        <div className="max-w-[1600px] mx-auto px-6 py-24">
          <div className="grid grid-cols-12 gap-6 mb-12">
            <div className="col-span-12 lg:col-span-5">
              <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-4">
                ▎ 03 · How it works
              </div>
              <h2 className="font-heading text-3xl lg:text-5xl font-bold tracking-tighter leading-tight">
                Non-custodial.
                <br />
                Verifiable.
                <br />
                <span className="text-accent">On-chain.</span>
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-7 lg:pt-16">
              <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
                Every trade fires a smart contract event. Every performance
                metric is reconstructed from on-chain logs. No database. No
                black box. Trade history that lives forever on Ethereum.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-px bg-border">
            {[
              {
                icon: Lock,
                title: "Funds stay in your vault",
                desc: "Smart contract vaults hold your USDC. Mirror execution is permissionless. We literally cannot touch your funds.",
                span: "col-span-12 md:col-span-6 lg:col-span-5",
              },
              {
                icon: Zap,
                title: "Sub-block copy execution",
                desc: "When a leader opens, the vault executes within the next block. Same price. Same direction. Scaled to your allocation.",
                span: "col-span-12 md:col-span-6 lg:col-span-7",
              },
              {
                icon: Eye,
                title: "On-chain reputation",
                desc: "Win rate, ROI, drawdown — all reconstructed from event logs. Cannot be falsified. Cannot be reset.",
                span: "col-span-12 md:col-span-6 lg:col-span-7",
              },
              {
                icon: Shield,
                title: "Auto-verified leaders",
                desc: "Win rate >70%, ROI >20%, >100 trades. Triggers verification badge automatically. No human gatekeepers.",
                span: "col-span-12 md:col-span-6 lg:col-span-5",
              },
            ].map((f, i) => (
              <div key={i} className={`${f.span} bg-background p-8`}>
                <f.icon className="w-6 h-6 mb-6 text-accent" />
                <h3 className="font-heading text-lg font-medium mb-3">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top traders */}
      <section className="relative border-t border-border bg-surface/30">
        <div className="max-w-[1600px] mx-auto px-6 py-24">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-3">
                ▎ Top verified performers
              </div>
              <h2
                className="font-heading text-3xl lg:text-5xl font-bold tracking-tighter"
                style={{ fontFamily: "var(--font-unbounded)" }}
              >
                The Leaderboard
              </h2>
            </div>
            <Link
              href="/explore"
              data-testid="leaderboard-see-all"
              className="hidden md:inline-flex items-center gap-2 border border-border px-5 py-2.5 hover:border-border-focus transition-colors text-sm"
            >
              See all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 border border-border bg-surface py-20 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading verified master traders
            </div>
          ) : topTraders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {topTraders.map((trader) => (
                <VerifiedMasterCard key={trader.traderId} trader={trader} />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-border py-20 text-center text-muted-foreground">
              No verified master traders yet.
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-[1600px] mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div
              className="font-heading text-sm font-bold tracking-tighter"
              style={{ fontFamily: "var(--font-unbounded)" }}
            >
              KOPITRADE
            </div>
            <div className="text-xs text-muted-foreground mt-1 font-mono">
              © 2026 · Non-custodial copy trading
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-xs text-muted-foreground font-mono uppercase tracking-wider">
            <span>Docs</span>
            <span>GitHub</span>
            <span>Contracts</span>
            <span>Audits</span>
            <span>Discord</span>
            <span>X / Twitter</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
