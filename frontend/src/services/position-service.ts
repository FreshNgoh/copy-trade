import { positionRepository } from "@/repositories/position-repository";
import { traderDashboardRepository } from "@/repositories/trader-dashboard-repository";
import { calculateTradeMetrics } from "@/lib/trading/calculation";
import type {
  ClosePositionDTO,
  CreatePositionDTO,
  UpdatePosition,
} from "@/types/position";

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getPositionInitialMargin(position) {
  const leverage = toNumber(position.leverage);
  if (leverage <= 0) return 0;

  return (toNumber(position.entry_price) * toNumber(position.quantity)) / leverage;
}

async function getFreeCollateral(traderWalletAddress: string) {
  const [portfolio, openPositions] = await Promise.all([
    traderDashboardRepository.ensurePortfolio(traderWalletAddress),
    positionRepository.getOpenPositions(traderWalletAddress),
  ]);
  const walletBalance = toNumber(portfolio.wallet_balance);
  const usedMargin = openPositions.reduce(
    (total, position) => total + getPositionInitialMargin(position),
    0,
  );

  return walletBalance - usedMargin;
}

async function syncOpenPositionCount(traderWalletAddress: string) {
  const openPositions = await positionRepository.getOpenPositions(
    traderWalletAddress,
  );

  await traderDashboardRepository.updateOpenPositionCount({
    traderWalletAddress,
    positions: openPositions.length,
  });
}

export async function assertSufficientFreeCollateral(data: CreatePositionDTO) {
  const metrics = calculateTradeMetrics({
    quantity: Number(data.quantity),
    entry_price: Number(data.entry_price),
    leverage: Number(data.leverage),
    direction: data.direction,
  });
  const freeCollateral = await getFreeCollateral(data.trader_wallet_address);

  if (metrics.initialMargin > freeCollateral) {
    throw new Error(
      `Insufficient free collateral. Required ${metrics.initialMargin.toFixed(
        2,
      )} USDC, available ${Math.max(freeCollateral, 0).toFixed(2)} USDC.`,
    );
  }

  return metrics;
}

export async function openOrIncreasePosition(data: CreatePositionDTO) {
  const quantity = Number(data.quantity);
  const entryPrice = Number(data.entry_price);
  const leverage = Number(data.leverage);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    throw new Error("Entry price must be greater than 0");
  }

  if (!Number.isFinite(leverage) || leverage <= 0) {
    throw new Error("Leverage must be greater than 0");
  }

  const tradeMetrics = await assertSufficientFreeCollateral(data);
  const existingPosition = await positionRepository.getOpenPosition({
    trader_wallet_address: data.trader_wallet_address,
    symbol: data.symbol,
    direction: data.direction,
  });

  if (!existingPosition) {
    const createdPosition = await positionRepository.createMarketOrder({
      ...data,
      liquidation_price: tradeMetrics.liquidationPrice,
    });

    await syncOpenPositionCount(data.trader_wallet_address);

    return createdPosition;
  }

  const oldQty = Number(existingPosition.quantity);
  const oldEntryPrice = Number(existingPosition.entry_price);
  const existingLeverage = Number(existingPosition.leverage);

  const newQty = oldQty + Number(data.quantity);

  const averageEntryPrice =
    (oldQty * oldEntryPrice +
      Number(data.quantity) * Number(data.entry_price)) /
    newQty;
  const updatedMetrics = calculateTradeMetrics({
    quantity: newQty,
    entry_price: averageEntryPrice,
    leverage: existingLeverage,
    direction: data.direction,
  });

  return positionRepository.updatePositionAfterFill({
    position_id: existingPosition.position_id,
    quantity: newQty,
    entry_price: averageEntryPrice,
    liquidation_price: updatedMetrics.liquidationPrice,
  });
}

export async function getOpenPositions(traderWalletAddress: string) {
  return positionRepository.getOpenPositions(traderWalletAddress);
}

export async function closePosition(position: ClosePositionDTO) {
  const closedPosition = await positionRepository.closePosition(position);

  await syncOpenPositionCount(position.trader_wallet_address);

  return closedPosition;
}

export async function getClosedPositions(traderWalletAddress: string) {
  return positionRepository.getClosedPositions(traderWalletAddress);
}

export async function updateActivePositions(position: UpdatePosition) {
  return positionRepository.updatePosition(position);
}
