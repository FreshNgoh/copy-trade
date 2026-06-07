'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { ArrowRight, Shield, Zap, Eye, Lock, TrendingUp } from 'lucide-react';
import { TRADERS, PLATFORM_STATS } from '@/lib/mock-data';
import { TraderCard } from '@/components/trader/trader-card';

const TICKER_ITEMS = [
  { pair: 'ETH/USDC', price: '$3,489.21', change: '+2.41%', up: true },
  { pair: 'BTC/USDC', price: '$67,455.00', change: '+0.95%', up: true },
  { pair: 'SOL/USDC', price: '$188.10', change: '-1.18%', up: false },
  { pair: 'ARB/USDC', price: '$0.79', change: '-5.95%', up: false },
  { pair: 'PEPE/USDC', price: '$0.000018', change: '+12.40%', up: true },
  { pair: 'LINK/USDC', price: '$15.84', change: '+3.20%', up: true },
  { pair: 'OP/USDC', price: '$2.41', change: '-0.88%', up: false },
  { pair: 'AVAX/USDC', price: '$38.21', change: '+1.74%', up: true },
];

export default function LandingPage() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const topTraders = TRADERS.slice(0, 4);

  return (
    <div data-testid="landing-page" className="bg-background overflow-hidden">
      {/* Ticker */}
      <div className="border-b border-border bg-surface overflow-hidden">
        <div className="flex marquee whitespace-nowrap py-2.5">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
            <div key={i} className="inline-flex items-center gap-3 px-6 font-mono text-xs">
              <span className="text-muted-foreground">{t.pair}</span>
              <span>{t.price}</span>
              <span className={t.up ? 'text-success' : 'text-danger'}>{t.change}</span>
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
              style={{ fontFamily: 'var(--font-unbounded)' }}
            >
              Copy the alphas.
              <br />
              <span className="text-accent">Trust the code.</span>
            </h1>

            <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10">
              The first fully decentralized, non-custodial copy trading terminal. Follow top-performing wallets automatically. Every trade is a smart contract event. Your funds never leave your vault.
            </p>

            <div className="flex flex-wrap gap-3 mb-12">
              <button
                data-testid="hero-connect-cta"
                onClick={() => (isConnected ? null : openConnectModal?.())}
                className="group inline-flex items-center gap-2 bg-white text-black px-7 py-3.5 font-medium hover:bg-neutral-200 transition-colors"
              >
                {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
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
                { label: 'Total Volume', value: PLATFORM_STATS.totalVolume },
                { label: 'Active Traders', value: PLATFORM_STATS.activeTraders.toLocaleString() },
                { label: 'Avg ROI', value: PLATFORM_STATS.avgRoi, accent: 'text-success' },
                { label: 'TVL', value: PLATFORM_STATS.tvl },
              ].map((s) => (
                <div key={s.label} className="bg-background p-4">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-1.5">
                    {s.label}
                  </div>
                  <div className={`font-mono text-xl ${s.accent || ''}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — Top Trader Spotlight */}
          <div className="lg:col-span-4 lg:pl-8 lg:border-l border-border flex flex-col gap-4">
            <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">
              ▎ Leader · 30D
            </div>
            <Link
              href={`/traders/${topTraders[0].address}`}
              className="block bg-surface border border-border p-5 hover:border-accent transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-14 h-14 overflow-hidden border border-border">
                  <Image src={topTraders[0].avatar} alt="" fill sizes="56px" className="object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{topTraders[0].ens}</span>
                    <Shield className="w-4 h-4 text-accent" fill="#00E5FF" stroke="#000" />
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {topTraders[0].address.slice(0, 6)}…{topTraders[0].address.slice(-4)}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                    30D ROI
                  </span>
                  <span className="font-mono text-4xl text-success font-medium">
                    +{topTraders[0].roi30d.toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                  <div>
                    <div className="text-[10px] uppercase font-mono text-muted-foreground">Win Rate</div>
                    <div className="font-mono">{topTraders[0].winRate}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono text-muted-foreground">AUM</div>
                    <div className="font-mono">${(topTraders[0].aum / 1e6).toFixed(1)}M</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono text-muted-foreground">Followers</div>
                    <div className="font-mono">{topTraders[0].followers.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center justify-between border border-border p-4 hover:border-border-focus group"
            >
              <span className="text-sm">See all 1,204 verified traders</span>
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
                Every trade fires a smart contract event. Every performance metric is reconstructed from on-chain logs. No database. No black box. Trade history that lives forever on Ethereum.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-px bg-border">
            {[
              {
                icon: Lock,
                title: 'Funds stay in your vault',
                desc: 'Smart contract vaults hold your USDC. Mirror execution is permissionless. We literally cannot touch your funds.',
                span: 'col-span-12 md:col-span-6 lg:col-span-5',
              },
              {
                icon: Zap,
                title: 'Sub-block copy execution',
                desc: 'When a leader opens, the vault executes within the next block. Same price. Same direction. Scaled to your allocation.',
                span: 'col-span-12 md:col-span-6 lg:col-span-7',
              },
              {
                icon: Eye,
                title: 'On-chain reputation',
                desc: 'Win rate, ROI, drawdown — all reconstructed from event logs. Cannot be falsified. Cannot be reset.',
                span: 'col-span-12 md:col-span-6 lg:col-span-7',
              },
              {
                icon: Shield,
                title: 'Auto-verified leaders',
                desc: 'Win rate >70%, ROI >20%, >100 trades. Triggers verification badge automatically. No human gatekeepers.',
                span: 'col-span-12 md:col-span-6 lg:col-span-5',
              },
            ].map((f, i) => (
              <div key={i} className={`${f.span} bg-background p-8`}>
                <f.icon className="w-6 h-6 mb-6 text-accent" />
                <h3 className="font-heading text-lg font-medium mb-3">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
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
                ▎ Top performers · 30D
              </div>
              <h2
                className="font-heading text-3xl lg:text-5xl font-bold tracking-tighter"
                style={{ fontFamily: 'var(--font-unbounded)' }}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {topTraders.map((t) => (
              <TraderCard key={t.id} trader={t} />
            ))}
          </div>
        </div>
      </section>

      {/* Revenue / Become trader CTA */}
      <section className="relative border-t border-border">
        <div className="max-w-[1600px] mx-auto px-6 py-24 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7 border border-border p-10 bg-surface relative overflow-hidden">
            <TrendingUp className="absolute -top-4 -right-4 w-40 h-40 text-accent opacity-10" />
            <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-4">
              ▎ For Traders
            </div>
            <h3 className="font-heading text-3xl lg:text-4xl font-bold tracking-tighter mb-4">
              Earn from your edge.
            </h3>
            <p className="text-muted-foreground mb-8 max-w-lg leading-relaxed">
              Top-performing wallets automatically earn 15% performance fees from copied profits. Build a public on-chain track record. Get followed.
            </p>
            <Link
              href="/become-trader"
              data-testid="landing-become-trader"
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 font-medium hover:brightness-110 transition-all"
            >
              Apply as Trader <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="col-span-12 lg:col-span-5 border border-border p-10 bg-surface">
            <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-4">
              ▎ For Followers
            </div>
            <h3 className="font-heading text-2xl lg:text-3xl font-bold tracking-tighter mb-4">
              Outsource the edge.
            </h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Set your allocation, your stop-loss, your daily limits. Then sleep.
            </p>
            <Link
              href="/dashboard"
              data-testid="landing-go-dashboard"
              className="inline-flex items-center gap-2 border border-border px-6 py-3 hover:border-border-focus transition-colors"
            >
              Open Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-[1600px] mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="font-heading text-sm font-bold tracking-tighter" style={{ fontFamily: 'var(--font-unbounded)' }}>
              ALPHAVAULT
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
