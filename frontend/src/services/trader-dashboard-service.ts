import { traderDashboardRepository } from "@/repositories/trader-dashboard-repository";
import type {
  TraderDashboard,
  TraderDashboardActivity,
  TraderDashboardPortfolio,
  TraderDashboardPosition,
} from "@/types/trader-dashboard";
import type { LimitOrder } from "@/types/limit-order";

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getPositionNotional(position: TraderDashboardPosition) {
  return toNumber(position.entry_price) * toNumber(position.quantity);
}

function getPositionMargin(position: TraderDashboardPosition) {
  const leverage = toNumber(position.leverage);
  if (leverage <= 0) return 0;

  return getPositionNotional(position) / leverage;
}

function createActivityFromPosition(
  position: TraderDashboardPosition,
): TraderDashboardActivity {
  const isClosed = position.status === "CLOSED";
  const pnl = toNumber(position.Pnl);
  const closeText =
    pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;

  return {
    id: position.position_id,
    type: isClosed ? "POSITION_CLOSE" : "POSITION_OPEN",
    symbol: position.symbol,
    direction: position.direction,
    detail: isClosed
      ? `Closed ${position.direction} ${position.symbol} ${closeText}`
      : `Opened ${position.direction} ${position.symbol} @ $${toNumber(
          position.entry_price,
        ).toFixed(2)}`,
    created_at: position.updated_at || position.created_at,
  };
}

function createActivityFromOrder(order: LimitOrder): TraderDashboardActivity {
  return {
    id: order.order_id,
    type: "ORDER_OPEN",
    symbol: order.symbol,
    direction: order.direction,
    detail: `Placed ${order.direction} ${order.symbol} limit @ $${toNumber(
      order.limit_price,
    ).toFixed(2)}`,
    created_at: order.created_at,
  };
}

export async function getTraderDashboard(
  traderWalletAddress: string,
): Promise<TraderDashboard> {
  const [portfolio, positions, openOrders] = await Promise.all([
    traderDashboardRepository.getPortfolio(traderWalletAddress),
    traderDashboardRepository.getPositions(traderWalletAddress),
    traderDashboardRepository.getOpenOrders(traderWalletAddress),
  ]);

  const activePositions = positions.filter(
    (position) => position.status === "OPEN",
  );
  const closedPositions = positions.filter(
    (position) => position.status === "CLOSED",
  );

  const realizedPnl = closedPositions.reduce(
    (total, position) => total + toNumber(position.Pnl),
    0,
  );
  const marginUsed = activePositions.reduce(
    (total, position) => total + getPositionMargin(position),
    0,
  );
  const openPositionValue = activePositions.reduce(
    (total, position) => total + getPositionNotional(position),
    0,
  );
  const winningTrades = closedPositions.filter(
    (position) => toNumber(position.Pnl) > 0,
  ).length;
  const averageRoi =
    closedPositions.length > 0
      ? closedPositions.reduce(
          (total, position) => total + toNumber(position.Roi),
          0,
        ) / closedPositions.length
      : 0;
  const portfolioData = portfolio
    ? ({
        ...portfolio,
        wallet_balance: toNumber(portfolio.wallet_balance),
        positions: toNumber(portfolio.positions),
        followers: toNumber(portfolio.followers),
      } as TraderDashboardPortfolio)
    : null;
  const walletBalance = portfolioData?.wallet_balance ?? 0;

  const recentActivity = [
    ...positions.map(createActivityFromPosition),
    ...openOrders.map(createActivityFromOrder),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 10);

  return {
    trader_wallet_address: traderWalletAddress,
    portfolio: portfolioData,
    stats: {
      totalPortfolioValue: walletBalance + realizedPnl,
      walletBalance,
      realizedPnl,
      marginUsed,
      freeCollateral: Math.max(walletBalance - marginUsed, 0),
      openPositionValue,
      openPositionsCount: portfolioData?.positions ?? activePositions.length,
      openOrdersCount: openOrders.length,
      closedTradesCount: closedPositions.length,
      followers: portfolioData?.followers ?? 0,
      winRate:
        closedPositions.length > 0
          ? (winningTrades / closedPositions.length) * 100
          : 0,
      averageRoi,
    },
    activePositions,
    closedPositions,
    openOrders,
    recentActivity,
  };
}

export async function ensureTraderPortfolio(traderWalletAddress: string) {
  return traderDashboardRepository.ensurePortfolio(traderWalletAddress);
}

export async function addTraderWalletBalance({
  traderWalletAddress,
  amount,
}: {
  traderWalletAddress: string;
  amount: number;
}) {
  if (amount <= 0) {
    throw new Error("Deposit amount must be greater than 0");
  }

  return traderDashboardRepository.addWalletBalance({
    traderWalletAddress,
    amount,
  });
}
