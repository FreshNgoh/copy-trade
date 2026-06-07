'use client';

import * as React from 'react';
import { TRADERS, type Trader } from '@/lib/mock-data';
import { TraderCard } from '@/components/trader/trader-card';
import { Slider } from '@/components/ui/slider';
import { Search, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const STYLES = ['All', 'Momentum', 'Mean Reversion', 'Swing', 'Scalping', 'Macro', 'Arbitrage'];

export default function ExplorePage() {
  const [search, setSearch] = React.useState('');
  const [minWinRate, setMinWinRate] = React.useState([0]);
  const [minRoi, setMinRoi] = React.useState([-50]);
  const [maxRisk, setMaxRisk] = React.useState([10]);
  const [style, setStyle] = React.useState<string>('All');
  const [sort, setSort] = React.useState<'roi' | 'followers' | 'aum' | 'winRate'>('roi');

  const filtered: Trader[] = React.useMemo(() => {
    let r = TRADERS.filter(
      (t) =>
        (style === 'All' || t.style === style) &&
        t.winRate >= minWinRate[0] &&
        t.roi30d >= minRoi[0] &&
        t.riskScore <= maxRisk[0] &&
        (search === '' || t.ens.toLowerCase().includes(search.toLowerCase()) || t.address.toLowerCase().includes(search.toLowerCase()))
    );
    r = r.sort((a, b) =>
      sort === 'roi'
        ? b.roi30d - a.roi30d
        : sort === 'followers'
        ? b.followers - a.followers
        : sort === 'aum'
        ? b.aum - a.aum
        : b.winRate - a.winRate
    );
    return r;
  }, [search, minWinRate, minRoi, maxRisk, style, sort]);

  return (
    <div data-testid="explore-page" className="bg-background min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-2">
            ▎ Marketplace
          </div>
          <h1
            className="font-heading text-3xl lg:text-5xl font-bold tracking-tighter mb-3"
            style={{ fontFamily: 'var(--font-unbounded)' }}
          >
            Explore Traders
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Browse verified wallets ranked by on-chain performance. Every metric is reconstructed from smart contract event logs.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Filter sidebar */}
          <aside className="col-span-12 lg:col-span-3 space-y-5">
            <div className="bg-surface border border-border p-4 sticky top-20">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-4 h-4 text-accent" />
                <span className="text-[10px] uppercase tracking-wider font-mono">Filters</span>
              </div>

              <div className="mb-4">
                <div className="flex items-center bg-background border border-border focus-within:border-accent">
                  <Search className="w-3.5 h-3.5 mx-3 text-muted-foreground" />
                  <input
                    data-testid="explore-search"
                    type="text"
                    placeholder="ENS or address"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent py-2 outline-none font-mono text-xs"
                  />
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Min Win Rate</span>
                  <span className="font-mono text-xs">{minWinRate[0]}%</span>
                </div>
                <Slider data-testid="filter-winrate" value={minWinRate} onValueChange={setMinWinRate} min={0} max={100} step={5} />
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Min 30D ROI</span>
                  <span className="font-mono text-xs">{minRoi[0]}%</span>
                </div>
                <Slider data-testid="filter-roi" value={minRoi} onValueChange={setMinRoi} min={-50} max={100} step={5} />
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Max Risk</span>
                  <span className="font-mono text-xs">{maxRisk[0]}/10</span>
                </div>
                <Slider data-testid="filter-risk" value={maxRisk} onValueChange={setMaxRisk} min={1} max={10} step={1} />
              </div>

              <div className="mb-5">
                <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-2">
                  Trading Style
                </div>
                <div className="flex flex-wrap gap-1">
                  {STYLES.map((s) => (
                    <button
                      key={s}
                      data-testid={`style-filter-${s}`}
                      onClick={() => setStyle(s)}
                      className={cn(
                        'text-[10px] font-mono uppercase tracking-wider px-2 py-1 border',
                        style === s ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted-foreground hover:border-border-focus'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-2">Sort By</div>
                <select
                  data-testid="sort-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="w-full bg-background border border-border px-2 py-1.5 font-mono text-xs outline-none focus:border-accent"
                >
                  <option value="roi">30D ROI</option>
                  <option value="winRate">Win Rate</option>
                  <option value="followers">Followers</option>
                  <option value="aum">AUM</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="col-span-12 lg:col-span-9">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground font-mono">
                {filtered.length} traders match
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="trader-grid">
              {filtered.map((t) => (
                <TraderCard key={t.id} trader={t} />
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full py-20 text-center text-muted-foreground border border-dashed border-border">
                  No traders match your filters.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
