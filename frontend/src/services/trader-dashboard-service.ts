import { traderDashboardRepository } from "@/repositories/trader-dashboard-repository";
import { positionRepository } from "@/repositories/position-repository";
import type {
  TraderDashboard,
  TraderDashboardActivity,
  TraderDashboardPerformanceStats,
  TraderDashboardPortfolio,
  TraderDashboardPosition,
} from "@/types/trader-dashboard";
import type { LimitOrder } from "@/types/limit-order";
import { calculateWalletLiquidationPrices } from "@/lib/trading/calculation";

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

function isCopyPosition(position: TraderDashboardPosition) {
  return position.trade_source === "COPY" || Boolean(position.copied_from_master);
}

function getSettledPnl(position: TraderDashboardPosition) {
  if (!isCopyPosition(position)) {
    return toNumber(position.Pnl);
  }

  const followerReward = toNumber(position.follower_reward);
  return followerReward || toNumber(position.Pnl);
}

function buildPerformanceStats(
  closedPositions: TraderDashboardPosition[],
  openPositions: TraderDashboardPosition[],
): TraderDashboardPerformanceStats {
  const realizedPnl = closedPositions.reduce(
    (total, position) => total + getSettledPnl(position),
    0,
  );
  const grossPnl = closedPositions.reduce(
    (total, position) => total + toNumber(position.gross_pnl ?? position.Pnl),
    0,
  );
  const masterRewards = closedPositions.reduce(
    (total, position) => total + toNumber(position.master_reward),
    0,
  );
  const followerRewards = closedPositions.reduce(
    (total, position) => total + toNumber(position.follower_reward),
    0,
  );
  const winningTrades = closedPositions.filter(
    (position) => getSettledPnl(position) > 0,
  ).length;
  const averageRoi =
    closedPositions.length > 0
      ? closedPositions.reduce(
          (total, position) => total + toNumber(position.Roi),
          0,
        ) / closedPositions.length
      : 0;

  return {
    closedTradesCount: closedPositions.length,
    openPositionsCount: openPositions.length,
    realizedPnl,
    grossPnl,
    masterRewards,
    followerRewards,
    winRate:
      closedPositions.length > 0
        ? (winningTrades / closedPositions.length) * 100
        : 0,
    averageRoi,
  };
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
  const manualActivePositions = activePositions.filter(
    (position) => !isCopyPosition(position),
  );
  const copyActivePositions = activePositions.filter(isCopyPosition);
  const manualClosedPositions = closedPositions.filter(
    (position) => !isCopyPosition(position),
  );
  const copyClosedPositions = closedPositions.filter(isCopyPosition);
  const manualPerformance = buildPerformanceStats(
    manualClosedPositions,
    manualActivePositions,
  );
  const copyPerformance = buildPerformanceStats(
    copyClosedPositions,
    copyActivePositions,
  );
  const allPerformance = buildPerformanceStats(closedPositions, activePositions);

  const realizedPnl = allPerformance.realizedPnl;
  const marginUsed = activePositions.reduce(
    (total, position) => total + getPositionMargin(position),
    0,
  );
  const manualMarginUsed = manualActivePositions.reduce(
    (total, position) => total + getPositionMargin(position),
    0,
  );
  const copyMarginUsed = copyActivePositions.reduce(
    (total, position) => total + getPositionMargin(position),
    0,
  );
  const openPositionValue = activePositions.reduce(
    (total, position) => total + getPositionNotional(position),
    0,
  );
  const portfolioData = portfolio
    ? ({
        ...portfolio,
        wallet_balance: toNumber(portfolio.wallet_balance),
        copy_wallet_balance: toNumber(portfolio.copy_wallet_balance),
        positions: toNumber(portfolio.positions),
        followers: toNumber(portfolio.followers),
      } as TraderDashboardPortfolio)
    : null;
  const walletBalance = portfolioData?.wallet_balance ?? 0;
  const copyWalletBalance = portfolioData?.copy_wallet_balance ?? 0;
  const totalWalletBalance = walletBalance + copyWalletBalance;
  const activePositionsWithLiquidation = calculateWalletLiquidationPrices(
    activePositions,
    { manual: walletBalance, copy: copyWalletBalance },
  );

  const recentActivity = [
    ...positions.map(createActivityFromPosition),
    ...openOrders.map(createActivityFromOrder),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  return {
    trader_wallet_address: traderWalletAddress,
    portfolio: portfolioData,
    stats: {
      totalPortfolioValue: totalWalletBalance + realizedPnl,
      walletBalance,
      copyWalletBalance,
      totalWalletBalance,
      realizedPnl,
      marginUsed,
      manualMarginUsed,
      copyMarginUsed,
      freeCollateral: Math.max(walletBalance - manualMarginUsed, 0),
      copyFreeCollateral: Math.max(copyWalletBalance - copyMarginUsed, 0),
      openPositionValue,
      openPositionsCount: portfolioData?.positions ?? activePositions.length,
      openOrdersCount: openOrders.length,
      closedTradesCount: closedPositions.length,
      followers: portfolioData?.followers ?? 0,
      winRate: allPerformance.winRate,
      averageRoi: allPerformance.averageRoi,
      manualPerformance,
      copyPerformance,
      allPerformance,
    },
    activePositions: activePositionsWithLiquidation,
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

export async function withdrawTraderWalletBalance({
  traderWalletAddress,
  amount,
}: {
  traderWalletAddress: string;
  amount: number;
}) {
  if (amount <= 0) {
    throw new Error("Withdraw amount must be greater than 0");
  }

  return traderDashboardRepository.subtractWalletBalance({
    traderWalletAddress,
    amount,
  });
}

export async function transferCopyWalletToManualWallet({
  traderWalletAddress,
  amount,
}: {
  traderWalletAddress: string;
  amount: number;
}) {
  if (amount <= 0) {
    throw new Error("Transfer amount must be greater than 0");
  }

  const [portfolio, activeCopiedMargin] = await Promise.all([
    traderDashboardRepository.ensurePortfolio(traderWalletAddress),
    positionRepository.getOpenCopiedMargin({
      followerWalletAddress: traderWalletAddress,
    }),
  ]);
  const copyWalletBalance = toNumber(portfolio.copy_wallet_balance);
  const copyFreeCollateral = Math.max(copyWalletBalance - activeCopiedMargin, 0);

  if (amount > copyFreeCollateral) {
    throw new Error(
      `Only ${copyFreeCollateral.toFixed(2)} USDC is available to transfer from copy wallet.`,
    );
  }

  return traderDashboardRepository.moveCopyWalletToWallet({
    traderWalletAddress,
    amount,
  });
}

export async function transferManualWalletToCopyWallet({
  traderWalletAddress,
  amount,
}: {
  traderWalletAddress: string;
  amount: number;
}) {
  if (amount <= 0) {
    throw new Error("Transfer amount must be greater than 0");
  }

  const [portfolio, activeManualMargin] = await Promise.all([
    traderDashboardRepository.ensurePortfolio(traderWalletAddress),
    positionRepository.getOpenManualMargin({
      traderWalletAddress,
    }),
  ]);
  const manualBalance = toNumber(portfolio.wallet_balance);
  const manualFreeCollateral = Math.max(manualBalance - activeManualMargin, 0);

  if (amount > manualFreeCollateral) {
    throw new Error(
      `Only ${manualFreeCollateral.toFixed(2)} USDC is available to transfer from manual wallet.`,
    );
  }

  return traderDashboardRepository.moveWalletToCopyWallet({
    traderWalletAddress,
    amount,
  });
}
