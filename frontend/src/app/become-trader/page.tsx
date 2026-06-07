'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { CheckCircle2, Circle, ArrowRight, Shield, TrendingUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const REQUIREMENTS = [
  { label: 'Win Rate', target: 70, current: 74, unit: '%', met: true },
  { label: 'Total Trades', target: 100, current: 142, unit: '', met: true },
  { label: '30D ROI', target: 20, current: 28, unit: '%', met: true },
  { label: 'Active Trading Days', target: 30, current: 45, unit: 'd', met: true },
  { label: 'Risk Score', target: '<=5', current: 4, unit: '/10', met: true },
  { label: 'Min Trading Volume', target: 50000, current: 84200, unit: 'USDC', met: true },
];

export default function BecomeTraderPage() {
  const { isConnected, address } = useAccount();
  const [name, setName] = React.useState('');
  const [style, setStyle] = React.useState('Momentum');
  const [bio, setBio] = React.useState('');
  const [twitter, setTwitter] = React.useState('');
  const [agree, setAgree] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const allMet = REQUIREMENTS.every((r) => r.met);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      toast.error('Accept the verifier terms first');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Application submitted', {
        description: 'Verification will complete automatically once the contract confirms your stats.',
      });
    }, 1200);
  };

  return (
    <div data-testid="become-trader-page" className="bg-background min-h-screen">
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="mb-10">
          <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-2">
            ▎ For Traders
          </div>
          <h1
            className="font-heading text-3xl lg:text-5xl font-bold tracking-tighter mb-3"
            style={{ fontFamily: 'var(--font-unbounded)' }}
          >
            Become a Verified Trader
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Verification is automatic. Once your on-chain stats cross the thresholds, the verifier contract grants you the badge. Then followers can copy you. You earn 15% of their performance.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {[
            { icon: TrendingUp, title: 'Auto-verification', desc: 'Smart contract checks stats every 24h. No human review.' },
            { icon: Shield, title: 'On-chain reputation', desc: 'Your track record is permanent and cannot be reset.' },
            { icon: Award, title: '15% performance fees', desc: 'Earn from every copier profit. Paid in USDC weekly.' },
          ].map((b, i) => (
            <div key={i} className="bg-surface border border-border p-5">
              <b.icon className="w-5 h-5 text-accent mb-3" />
              <div className="font-medium mb-1">{b.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{b.desc}</div>
            </div>
          ))}
        </div>

        {/* Requirements */}
        <div className="bg-surface border border-border mb-6">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              ▎ On-chain Eligibility
            </span>
            <span
              className={cn(
                'text-[10px] font-mono uppercase tracking-wider px-2 py-1 border',
                allMet ? 'border-success text-success bg-success/10' : 'border-warning text-warning'
              )}
            >
              {allMet ? 'All Requirements Met' : 'Not Eligible'}
            </span>
          </div>
          <div className="divide-y divide-border">
            {REQUIREMENTS.map((r) => (
              <div key={r.label} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {r.met ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="text-sm">{r.label}</div>
                    <div className="text-[10px] uppercase font-mono text-muted-foreground">
                      Target: {typeof r.target === 'string' ? r.target : r.target.toLocaleString()}
                      {r.unit}
                    </div>
                  </div>
                </div>
                <div className={cn('font-mono text-base', r.met ? 'text-success' : 'text-muted-foreground')}>
                  {r.current.toLocaleString()}
                  {r.unit}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Application form */}
        <form onSubmit={handleSubmit} className="bg-surface border border-border p-6 space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-3">
              ▎ Public Profile
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Display Name / ENS
            </label>
            <input
              data-testid="apply-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="alphatrader.eth"
              className="w-full mt-1 bg-background border border-border focus:border-accent outline-none px-3 py-2.5 font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Trading Style
              </label>
              <select
                data-testid="apply-style"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full mt-1 bg-background border border-border focus:border-accent outline-none px-3 py-2.5 font-mono text-sm"
              >
                {['Momentum', 'Mean Reversion', 'Swing', 'Scalping', 'Macro', 'Arbitrage'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Twitter / X (optional)
              </label>
              <input
                data-testid="apply-twitter"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="@yourhandle"
                className="w-full mt-1 bg-background border border-border focus:border-accent outline-none px-3 py-2.5 font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Bio (visible on profile)
            </label>
            <textarea
              data-testid="apply-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={280}
              placeholder="Quant-driven momentum trader. Mid-cap rotations..."
              className="w-full mt-1 bg-background border border-border focus:border-accent outline-none px-3 py-2.5 font-mono text-sm resize-none"
            />
            <div className="text-[10px] font-mono text-muted-foreground mt-1 text-right">{bio.length}/280</div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              data-testid="apply-agree"
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-1 accent-[#00E5FF]"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              I understand that verification is automatically calculated from on-chain events. My wallet address and trade history will be publicly displayed. Performance fees (15%) will be charged on copier profits.
            </span>
          </label>

          <div className="flex flex-col md:flex-row gap-3 pt-2">
            <button
              type="submit"
              data-testid="apply-submit"
              disabled={!isConnected || submitting}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 font-medium transition-all',
                isConnected
                  ? 'bg-accent text-accent-foreground hover:brightness-110'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed'
              )}
            >
              {!isConnected ? 'Connect Wallet First' : submitting ? 'Submitting…' : 'Submit Application'}
              <ArrowRight className="w-4 h-4" />
            </button>
            {isConnected && (
              <span className="self-center font-mono text-xs text-muted-foreground">
                Signed from {address?.slice(0, 6)}…{address?.slice(-4)}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
