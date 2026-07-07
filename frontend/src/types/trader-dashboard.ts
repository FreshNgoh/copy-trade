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
  positions: number;
  followers: number;
}

export interface TraderDashboardStats {
  totalPortfolioValue: number;
  walletBalance: number;
  realizedPnl: number;
  marginUsed: number;
  freeCollateral: number;
  openPositionValue: number;
  openPositionsCount: number;
  openOrdersCount: number;
  closedTradesCount: number;
  followers: number;
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
