import { positionRepository } from "@/repositories/position-repository";
import { traderDashboardRepository } from "@/repositories/trader-dashboard-repository";
import { calculateTradeMetrics } from "@/lib/trading/calculation";
import type {
  ClosePositionDTO,
  CreatePositionDTO,
  UpdatePosition,
} from "@/types/position";
import {
  storeTradeHistoryRecord,
  stringToBytes32,
  toScaledInteger,
  toUnixTimestamp,
} from "@/lib/web3/trade-history/server";

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

const TRADE_HISTORY_DECIMALS = {
  quantity: 6,
  price: 2,
  pnl: 2,
  roi: 4,
} as const;

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

async function syncClosedPositionToChain(
  position,
  options: { throwOnError?: boolean } = {},
) {
  const lockedForSync = await positionRepository.markOnChainSyncing(
    position.position_id,
  );

  if (!lockedForSync) return;

  try {
    const result = await storeTradeHistoryRecord({
      user: position.trader_wallet_address,
      openTime: toUnixTimestamp(position.created_at),
      closedTime: toUnixTimestamp(position.updated_at),
      direction: position.direction === "LONG" ? 0 : 1,
      quantityDecimals: TRADE_HISTORY_DECIMALS.quantity,
      priceDecimals: TRADE_HISTORY_DECIMALS.price,
      pnlDecimals: TRADE_HISTORY_DECIMALS.pnl,
      roiDecimals: TRADE_HISTORY_DECIMALS.roi,
      symbol: stringToBytes32(position.symbol),
      quantity: toScaledInteger(position.quantity, TRADE_HISTORY_DECIMALS.quantity),
      entryPrice: toScaledInteger(position.entry_price, TRADE_HISTORY_DECIMALS.price),
      closingPrice: toScaledInteger(
        position.closing_price,
        TRADE_HISTORY_DECIMALS.price,
      ),
      pnl: toScaledInteger(position.Pnl, TRADE_HISTORY_DECIMALS.pnl),
      roi: toScaledInteger(position.Roi, TRADE_HISTORY_DECIMALS.roi),
    });

    await positionRepository.saveOnChainSyncSuccess({
      positionId: position.position_id,
      tradeId: result.tradeId,
      txHash: result.txHash,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await positionRepository.saveOnChainSyncFailure({
      positionId: position.position_id,
      errorMessage,
    });

    if (options.throwOnError) {
      throw error;
    }

    console.error("TradeHistory on-chain sync failed:", {
      positionId: position.position_id,
      error: errorMessage,
    });
  }
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
  await syncClosedPositionToChain(closedPosition);

  return closedPosition;
}

export async function syncClosedPositionById({
  positionId,
  traderWalletAddress,
}: {
  positionId: string;
  traderWalletAddress: string;
}) {
  const closedPosition = await positionRepository.getClosedPositionById({
    positionId,
    traderWalletAddress,
  });

  if (!closedPosition) {
    throw new Error("Closed position not found");
  }

  await syncClosedPositionToChain(closedPosition, { throwOnError: true });

  return positionRepository.getClosedPositionById({
    positionId,
    traderWalletAddress,
  });
}

export async function getClosedPositions(traderWalletAddress: string) {
  return positionRepository.getClosedPositions(traderWalletAddress);
}

export async function updateActivePositions(position: UpdatePosition) {
  return positionRepository.updatePosition(position);
}
