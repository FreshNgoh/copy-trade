import type { LimitOrder } from "./limit-order";
import type { Position } from "./position";

export type TraderDashboardPosition = Position & {
  closing_price?: number | null;
  Pnl?: number | null;
  Roi?: number | null;
};

export interface TraderDashboardPortfolio {
  trader_id: string;
  trader_wallet_address: string;
  wallet_balance: number;
  copy_wallet_balance: number;
  positions: number;
  followers: number;
  is_verified_master?: boolean;
}

export interface TraderDashboardStats {
  totalPortfolioValue: number;
  walletBalance: number;
  copyWalletBalance: number;
  totalWalletBalance: number;
  realizedPnl: number;
  marginUsed: number;
  manualMarginUsed: number;
  copyMarginUsed: number;
  freeCollateral: number;
  copyFreeCollateral: number;
  openPositionValue: number;
  openPositionsCount: number;
  openOrdersCount: number;
  closedTradesCount: number;
  followers: number;
  winRate: number;
  averageRoi: number;
  manualPerformance: TraderDashboardPerformanceStats;
  copyPerformance: TraderDashboardPerformanceStats;
  allPerformance: TraderDashboardPerformanceStats;
}

export interface TraderDashboardPerformanceStats {
  closedTradesCount: number;
  openPositionsCount: number;
  realizedPnl: number;
  grossPnl: number;
  masterRewards: number;
  followerRewards: number;
  winRate: number;
  averageRoi: number;
}

export interface TraderDashboardActivity {
  id: string;
  type: "POSITION_OPEN" | "POSITION_CLOSE" | "ORDER_OPEN";
  symbol: string;
  direction: "LONG" | "SHORT";
  detail: string;
  created_at: string;
}

export interface TraderDashboard {
  trader_wallet_address: string;
  portfolio: TraderDashboardPortfolio | null;
  stats: TraderDashboardStats;
  activePositions: TraderDashboardPosition[];
  closedPositions: TraderDashboardPosition[];
  openOrders: LimitOrder[];
  recentActivity: TraderDashboardActivity[];
}
