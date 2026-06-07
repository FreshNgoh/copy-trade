// Mock data layer - simulates on-chain reconstructed trader/trade data
// In production this would be reconstructed from smart contract events via RPC log queries

export type Trader = {
  id: string;
  address: `0x${string}`;
  ens: string;
  avatar: string;
  verified: boolean;
  winRate: number; // %
  roi30d: number; // %
  roiAll: number; // %
  followers: number;
  aum: number; // USD
  totalTrades: number;
  totalPnl: number; // USD
  riskScore: number; // 1-10
  maxDrawdown: number; // %
  style: 'Momentum' | 'Mean Reversion' | 'Swing' | 'Scalping' | 'Macro' | 'Arbitrage';
  bio: string;
  sparkline: number[];
  perfSeries: { t: number; pnl: number }[];
  recentTrades: Trade[];
};

export type Trade = {
  id: string;
  pair: string;
  side: 'LONG' | 'SHORT';
  leverage: number;
  entry: number;
  exit: number | null;
  size: number;
  pnl: number;
  timestamp: number;
  txHash: `0x${string}`;
  status: 'OPEN' | 'CLOSED';
};

export type Position = {
  id: string;
  pair: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entry: number;
  mark: number;
  liquidation: number;
  pnl: number;
  pnlPct: number;
  copiedFrom?: string;
  leverage: number;
};

function rand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function genSparkline(seed: number, len = 24, drift = 0.5) {
  const pts: number[] = [];
  let v = 100;
  for (let i = 0; i < len; i++) {
    v += (rand(seed + i) - 0.5 + drift * 0.04) * 6;
    pts.push(Math.max(40, v));
  }
  return pts;
}

function genPerfSeries(seed: number, len = 90, drift = 0.6) {
  const pts: { t: number; pnl: number }[] = [];
  let v = 0;
  const now = Date.now();
  for (let i = len; i >= 0; i--) {
    v += (rand(seed + i) - 0.4 + drift * 0.1) * 2500;
    pts.push({ t: now - i * 86400000, pnl: Math.round(v) });
  }
  return pts;
}

function genTrades(seed: number, count = 12): Trade[] {
  const pairs = ['ETH/USDC', 'BTC/USDC', 'SOL/USDC', 'ARB/USDC', 'PEPE/USDC', 'LINK/USDC'];
  const trades: Trade[] = [];
  for (let i = 0; i < count; i++) {
    const r = rand(seed + i);
    const r2 = rand(seed + i + 100);
    const pair = pairs[Math.floor(r * pairs.length)];
    const side = r2 > 0.5 ? 'LONG' : 'SHORT';
    const entry = 100 + r * 4000;
    const exit = entry * (1 + (r2 - 0.45) * 0.2);
    const size = Math.round(500 + r * 9500);
    const pnl = side === 'LONG' ? (exit - entry) * (size / entry) : (entry - exit) * (size / entry);
    trades.push({
      id: `t-${seed}-${i}`,
      pair,
      side,
      leverage: [1, 2, 3, 5, 10][Math.floor(r2 * 5)],
      entry: Math.round(entry * 100) / 100,
      exit: Math.round(exit * 100) / 100,
      size,
      pnl: Math.round(pnl * 100) / 100,
      timestamp: Date.now() - i * 3600000 * 8,
      txHash: `0x${Math.abs(Math.floor(r * 1e16)).toString(16).padStart(16, '0')}${Math.abs(Math.floor(r2 * 1e16)).toString(16).padStart(16, '0')}${'a'.repeat(32)}` as `0x${string}`,
      status: i < 2 ? 'OPEN' : 'CLOSED',
    });
  }
  return trades;
}

const styles: Trader['style'][] = ['Momentum', 'Mean Reversion', 'Swing', 'Scalping', 'Macro', 'Arbitrage'];

const traderSeeds = [
  { ens: 'cryptowolf.eth', avatar: 'https://images.pexels.com/photos/7688595/pexels-photo-7688595.jpeg', bio: 'Quant-driven momentum trader. Specializing in mid-cap rotations. 4y on-chain track record.' },
  { ens: 'alphakid.eth', avatar: 'https://images.pexels.com/photos/8107821/pexels-photo-8107821.jpeg', bio: 'Macro view + mean reversion plays. Risk management is everything. Survive first, then thrive.' },
  { ens: 'whaleharbor.eth', avatar: 'https://images.pexels.com/photos/8108063/pexels-photo-8108063.jpeg', bio: 'On-chain native since 2017. Spot and perps. Boring is profitable.' },
  { ens: 'degenmoon.eth', avatar: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg', bio: 'High-leverage scalper. Not for the faint of heart. Following only recommended <5% portfolio.' },
  { ens: 'merlin.eth', avatar: 'https://images.pexels.com/photos/8636597/pexels-photo-8636597.jpeg', bio: 'Arbitrage flows between L2s and CEX. Low risk, consistent returns.' },
  { ens: 'voidsailor.eth', avatar: 'https://images.pexels.com/photos/7567444/pexels-photo-7567444.jpeg', bio: 'Swing trader. Multi-week positions. Patience over panic.' },
  { ens: 'nakamoto.lens', avatar: 'https://images.pexels.com/photos/4587971/pexels-photo-4587971.jpeg', bio: 'Conservative momentum trader. Strict stop-losses. Compound the wins.' },
  { ens: 'fractalbot.eth', avatar: 'https://images.pexels.com/photos/3760529/pexels-photo-3760529.jpeg', bio: 'Algorithmic strategies. Backtested for 5 years. Fully transparent on-chain.' },
];

export const TRADERS: Trader[] = traderSeeds.map((t, i) => {
  const winRate = 60 + Math.round(rand(i + 1) * 32);
  const roi30d = Math.round((rand(i + 2) * 80 - 5) * 10) / 10;
  const followers = Math.round(50 + rand(i + 3) * 4500);
  const aum = Math.round(50000 + rand(i + 4) * 2500000);
  return {
    id: `trader-${i}`,
    address: `0x${Math.abs(Math.floor(rand(i + 7) * 1e16)).toString(16).padStart(40, '0').slice(0, 40)}` as `0x${string}`,
    ens: t.ens,
    avatar: t.avatar,
    verified: winRate > 70 && roi30d > 20,
    winRate,
    roi30d,
    roiAll: Math.round(roi30d * (3 + rand(i + 5) * 2) * 10) / 10,
    followers,
    aum,
    totalTrades: 80 + Math.round(rand(i + 6) * 800),
    totalPnl: Math.round(aum * (roi30d / 100)),
    riskScore: Math.min(10, Math.max(1, Math.round(rand(i + 8) * 10))),
    maxDrawdown: Math.round(rand(i + 9) * 35 * 10) / 10,
    style: styles[i % styles.length],
    bio: t.bio,
    sparkline: genSparkline(i + 10, 24, roi30d > 0 ? 0.8 : 0.2),
    perfSeries: genPerfSeries(i + 20, 90, roi30d / 100 + 0.5),
    recentTrades: genTrades(i + 50, 15),
  };
});

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export function generateCandles(pair = 'ETH/USDC', count = 200): Candle[] {
  const seed = pair.charCodeAt(0) + pair.charCodeAt(pair.length - 1);
  const base = pair.startsWith('BTC') ? 67000 : pair.startsWith('ETH') ? 3450 : pair.startsWith('SOL') ? 188 : 12;
  const candles: Candle[] = [];
  let price = base;
  const now = Math.floor(Date.now() / 1000);
  for (let i = count; i >= 0; i--) {
    const time = now - i * 3600;
    const open = price;
    const move = (rand(seed + i) - 0.49) * base * 0.012;
    const close = open + move;
    const high = Math.max(open, close) + rand(seed + i + 1) * base * 0.005;
    const low = Math.min(open, close) - rand(seed + i + 2) * base * 0.005;
    const volume = Math.round(1000 + rand(seed + i + 3) * 4000);
    candles.push({ time, open, high, low, close, volume });
    price = close;
  }
  return candles;
}

export function generateOrderBook(midPrice: number) {
  const bids: { price: number; size: number; total: number }[] = [];
  const asks: { price: number; size: number; total: number }[] = [];
  let bTotal = 0;
  let aTotal = 0;
  for (let i = 0; i < 12; i++) {
    const bSize = Math.round((0.5 + rand(i + 7) * 14) * 100) / 100;
    const aSize = Math.round((0.5 + rand(i + 17) * 14) * 100) / 100;
    bTotal += bSize;
    aTotal += aSize;
    bids.push({ price: Math.round((midPrice - (i + 1) * midPrice * 0.0008) * 100) / 100, size: bSize, total: Math.round(bTotal * 100) / 100 });
    asks.push({ price: Math.round((midPrice + (i + 1) * midPrice * 0.0008) * 100) / 100, size: aSize, total: Math.round(aTotal * 100) / 100 });
  }
  return { bids, asks };
}

export const PLATFORM_STATS = {
  totalVolume: '$2.41B',
  activeTraders: 1204,
  avgRoi: '+34.2%',
  totalFollowers: 18450,
  trades24h: 41320,
  tvl: '$184.2M',
};

export const ACTIVE_POSITIONS: Position[] = [
  { id: 'p1', pair: 'ETH/USDC', side: 'LONG', size: 4200, entry: 3421.5, mark: 3489.2, liquidation: 2980.5, pnl: 92.4, pnlPct: 1.98, copiedFrom: 'cryptowolf.eth', leverage: 3 },
  { id: 'p2', pair: 'SOL/USDC', side: 'SHORT', size: 1800, entry: 192.4, mark: 188.1, liquidation: 235.6, pnl: 40.3, pnlPct: 2.24, copiedFrom: 'alphakid.eth', leverage: 2 },
  { id: 'p3', pair: 'BTC/USDC', side: 'LONG', size: 8400, entry: 66820, mark: 67455, liquidation: 58420, pnl: 79.8, pnlPct: 0.95, leverage: 2 },
  { id: 'p4', pair: 'ARB/USDC', side: 'LONG', size: 1200, entry: 0.84, mark: 0.79, liquidation: 0.61, pnl: -71.4, pnlPct: -5.95, copiedFrom: 'voidsailor.eth', leverage: 1 },
];

export const RECENT_ACTIVITY = [
  { id: 'a1', type: 'COPY_OPEN', trader: 'cryptowolf.eth', detail: 'Opened LONG ETH/USDC @ $3,421', time: '2m ago', tx: '0x9a2b...44f1' },
  { id: 'a2', type: 'TRADE_CLOSE', trader: 'alphakid.eth', detail: 'Closed SHORT SOL/USDC +$240', time: '14m ago', tx: '0x5e1f...88a2' },
  { id: 'a3', type: 'COPY_OPEN', trader: 'whaleharbor.eth', detail: 'Opened LONG ARB/USDC @ $0.84', time: '38m ago', tx: '0x771a...d4c2' },
  { id: 'a4', type: 'FOLLOW', trader: 'merlin.eth', detail: 'Started copying — 5% allocation', time: '1h ago', tx: '0xb801...01f9' },
  { id: 'a5', type: 'DEPOSIT', trader: 'You', detail: 'Deposited 2,000 USDC to vault', time: '3h ago', tx: '0x4400...91ab' },
  { id: 'a6', type: 'TRADE_CLOSE', trader: 'cryptowolf.eth', detail: 'Closed LONG PEPE +$1,205', time: '5h ago', tx: '0xfa20...8e21' },
];

export const TRADER_APPLICATIONS = [
  { id: 'app1', address: '0x4d8a...2c11', ens: 'newalpha.eth', winRate: 74, totalTrades: 142, roi: 28, riskScore: 4, submitted: '2h ago', status: 'PENDING' as const },
  { id: 'app2', address: '0x91fa...0e33', ens: 'quantum.eth', winRate: 81, totalTrades: 320, roi: 52, riskScore: 6, submitted: '6h ago', status: 'PENDING' as const },
  { id: 'app3', address: '0x77c0...991b', ens: 'shadowtrader.eth', winRate: 66, totalTrades: 88, roi: 12, riskScore: 8, submitted: '1d ago', status: 'REJECTED' as const },
  { id: 'app4', address: '0x2244...77ee', ens: 'satoshijr.eth', winRate: 78, totalTrades: 210, roi: 34, riskScore: 3, submitted: '2d ago', status: 'APPROVED' as const },
];
