import { positionRepository } from "@/repositories/position-repository";
import { traderDashboardRepository } from "@/repositories/trader-dashboard-repository";
import { calculateTradeMetrics, calculateWalletLiquidationPrices } from "@/lib/trading/calculation";
import { copyMasterPositionToFollowers } from "@/services/copy-trading-service";
import { closeCopiedTradeOnChain } from "@/lib/web3/copy-trading/server";
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

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const TRADE_SOURCE_OWN = 0;
const TRADE_SOURCE_COPY = 1;
const TRADE_SOURCE_COPY_REWARD = 2;
const MASTER_REWARD_BPS = 7_000;
const BPS_DENOMINATOR = 10_000;

function getPositionInitialMargin(position) {
  const leverage = toNumber(position.leverage);
  if (leverage <= 0) return 0;

  return (toNumber(position.entry_price) * toNumber(position.quantity)) / leverage;
}

async function getFreeCollateral(
  traderWalletAddress: string,
  wallet: "manual" | "copy",
) {
  const [portfolio, openPositions] = await Promise.all([
    traderDashboardRepository.ensurePortfolio(traderWalletAddress),
    positionRepository.getOpenPositions(traderWalletAddress),
  ]);
  const walletBalance = toNumber(
    wallet === "copy" ? portfolio.copy_wallet_balance : portfolio.wallet_balance,
  );
  if (wallet === "copy" && !portfolio.is_verified_master) {
    throw new Error("Only verified master traders can open Copy Mode trades");
  }
  const walletPositions = openPositions.filter((position) =>
    wallet === "copy" ? usesCopyWallet(position) : !usesCopyWallet(position),
  );
  const usedMargin = walletPositions.reduce(
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
    const records = buildTradeHistoryRecords(position);
    const [result] = await Promise.all(records.map((record) => storeTradeHistoryRecord(record)));

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

function buildTradeHistoryRecords(position) {
  const grossPnl = toNumber(position.gross_pnl ?? position.Pnl);
  const masterReward = toNumber(position.master_reward);
  const followerReward = toNumber(position.follower_reward);
  const isCopy = isCopiedPosition(position);
  const master = isCopy ? position.copied_from_master : ZERO_ADDRESS;
  const follower = isCopy ? position.trader_wallet_address : ZERO_ADDRESS;
  const baseRecord = {
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
    closingPrice: toScaledInteger(position.closing_price, TRADE_HISTORY_DECIMALS.price),
    roi: toScaledInteger(position.Roi, TRADE_HISTORY_DECIMALS.roi),
    grossPnl: toScaledInteger(grossPnl, TRADE_HISTORY_DECIMALS.pnl),
    masterReward: toScaledInteger(masterReward, TRADE_HISTORY_DECIMALS.pnl),
    followerReward: toScaledInteger(followerReward, TRADE_HISTORY_DECIMALS.pnl),
  };

  if (!isCopy) {
    return [
      {
        ...baseRecord,
        user: position.trader_wallet_address,
        master: ZERO_ADDRESS,
        follower: ZERO_ADDRESS,
        source: TRADE_SOURCE_OWN,
        pnl: toScaledInteger(position.Pnl, TRADE_HISTORY_DECIMALS.pnl),
      },
    ];
  }

  return [
    {
      ...baseRecord,
      user: position.trader_wallet_address,
      master,
      follower,
      source: TRADE_SOURCE_COPY,
      pnl: toScaledInteger(followerReward, TRADE_HISTORY_DECIMALS.pnl),
    },
    {
      ...baseRecord,
      user: master,
      master,
      follower,
      source: TRADE_SOURCE_COPY_REWARD,
      pnl: toScaledInteger(masterReward, TRADE_HISTORY_DECIMALS.pnl),
    },
  ];
}

export async function assertSufficientFreeCollateral(data: CreatePositionDTO) {
  const metrics = calculateTradeMetrics({
    quantity: Number(data.quantity),
    entry_price: Number(data.entry_price),
    leverage: Number(data.leverage),
    direction: data.direction,
  });
  const wallet = data.execution_mode === "COPY" ? "copy" : "manual";
  const freeCollateral = await getFreeCollateral(data.trader_wallet_address, wallet);

  if (metrics.initialMargin > freeCollateral) {
    throw new Error(
      `Insufficient ${wallet === "copy" ? "Copy Wallet" : "Manual Wallet"} collateral. Required ${metrics.initialMargin.toFixed(
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

  await assertSufficientFreeCollateral(data);
  const tradeSource = data.execution_mode === "COPY" ? "MASTER_COPY" : "OWN";
  const existingPosition = await positionRepository.getOpenPosition({
    trader_wallet_address: data.trader_wallet_address,
    symbol: data.symbol,
    direction: data.direction,
    trade_source: tradeSource,
  });

  if (!existingPosition) {
    const createdPosition = await positionRepository.createMarketOrder({
      ...data,
      trade_source: tradeSource,
    });

    await syncOpenPositionCount(data.trader_wallet_address);
    await syncCopiedFollowers(data);

    return createdPosition;
  }

  const oldQty = Number(existingPosition.quantity);
  const oldEntryPrice = Number(existingPosition.entry_price);
  const newQty = oldQty + Number(data.quantity);

  const averageEntryPrice =
    (oldQty * oldEntryPrice +
      Number(data.quantity) * Number(data.entry_price)) /
    newQty;
  const updatedPosition = await positionRepository.updatePositionAfterFill({
    position_id: existingPosition.position_id,
    quantity: newQty,
    entry_price: averageEntryPrice,
    leverage: Number(data.leverage),
  });

  await syncCopiedFollowers(data);

  return updatedPosition;
}

async function syncCopiedFollowers(data: CreatePositionDTO) {
  if (data.execution_mode !== "COPY") return;

  try {
    await copyMasterPositionToFollowers(data);
  } catch (error) {
    console.error("Copy trading fan-out failed:", error);
  }
}

export async function getOpenPositions(traderWalletAddress: string) {
  const [positions, portfolio] = await Promise.all([
    positionRepository.getOpenPositions(traderWalletAddress),
    traderDashboardRepository.ensurePortfolio(traderWalletAddress),
  ]);

  return calculateWalletLiquidationPrices(positions, {
    manual: toNumber(portfolio.wallet_balance),
    copy: toNumber(portfolio.copy_wallet_balance),
  });
}

export async function closePosition(position: ClosePositionDTO) {
  const closedPosition = await positionRepository.closePosition(position);

  await settleClosedPositionRewards(closedPosition);
  await releaseCopiedMargin(closedPosition);
  await syncOpenPositionCount(position.trader_wallet_address);
  await syncClosedPositionToChain(closedPosition);

  return closedPosition;
}

async function settleClosedPositionRewards(position) {
  const grossPnl = toNumber(position.Pnl);
  const rewards = getRewardSplit(position, grossPnl);
  const shouldSettle = await positionRepository.markRewardsSettled({
    positionId: position.position_id,
    grossPnl,
    masterReward: rewards.masterReward,
    followerReward: rewards.followerReward,
  });

  if (!shouldSettle) return;

  if (isCopiedPosition(position)) {
    await applyCopyWalletDelta(
      position.trader_wallet_address,
      rewards.followerReward,
    );

    if (rewards.masterReward > 0 && position.copied_from_master) {
      await applyWalletDelta(position.copied_from_master, rewards.masterReward);
    }

    position.gross_pnl = grossPnl;
    position.master_reward = rewards.masterReward;
    position.follower_reward = rewards.followerReward;
    return;
  }

  if (usesCopyWallet(position)) {
    await applyCopyWalletDelta(position.trader_wallet_address, grossPnl);
    position.gross_pnl = grossPnl;
    position.master_reward = 0;
    position.follower_reward = 0;
    return;
  }

  await applyWalletDelta(position.trader_wallet_address, grossPnl);

  position.gross_pnl = grossPnl;
  position.master_reward = 0;
  position.follower_reward = 0;
}

async function releaseCopiedMargin(position) {
  if (!isCopiedPosition(position)) return;

  const copyPositionIds = Array.from(
    new Set(
      Array.isArray(position.copy_trade_position_ids) &&
      position.copy_trade_position_ids.length > 0
        ? position.copy_trade_position_ids
        : position.copy_trade_position_id
          ? [position.copy_trade_position_id]
          : [],
    ),
  );
  if (copyPositionIds.length === 0) return;

  try {
    await Promise.all(
      copyPositionIds.map((id) => closeCopiedTradeOnChain(String(id))),
    );
  } catch (error) {
    console.error("CopyTrading margin release failed:", {
      positionId: position.position_id,
      copyTradePositionId: position.copy_trade_position_id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function getRewardSplit(position, grossPnl: number) {
  if (!isCopiedPosition(position) || grossPnl <= 0) {
    return {
      masterReward: 0,
      followerReward: grossPnl,
    };
  }

  const masterReward = (grossPnl * MASTER_REWARD_BPS) / BPS_DENOMINATOR;

  return {
    masterReward,
    followerReward: grossPnl - masterReward,
  };
}

async function applyWalletDelta(traderWalletAddress: string, amount: number) {
  if (amount === 0) return;

  if (amount > 0) {
    await traderDashboardRepository.addWalletBalance({
      traderWalletAddress,
      amount,
    });
    return;
  }

  await traderDashboardRepository.subtractWalletBalance({
    traderWalletAddress,
    amount: Math.abs(amount),
  });
}

async function applyCopyWalletDelta(traderWalletAddress: string, amount: number) {
  if (amount === 0) return;

  if (amount > 0) {
    await traderDashboardRepository.addCopyWalletBalance({
      traderWalletAddress,
      amount,
    });
    return;
  }

  await traderDashboardRepository.subtractCopyWalletBalance({
    traderWalletAddress,
    amount: Math.abs(amount),
  });
}

function isCopiedPosition(position) {
  return position.trade_source === "COPY" || Boolean(position.copied_from_master);
}

function usesCopyWallet(position) {
  return position.trade_source === "MASTER_COPY" || isCopiedPosition(position);
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
  const updatedPosition = await positionRepository.updatePosition(position);

  if (updatedPosition.trade_source === "MASTER_COPY") {
    await positionRepository.updateCopiedPositionsTpSl({
      masterWalletAddress: updatedPosition.trader_wallet_address,
      symbol: updatedPosition.symbol,
      direction: updatedPosition.direction,
      takeProfit: updatedPosition.take_profit,
      stopLoss: updatedPosition.stop_loss,
    });
  }

  return updatedPosition;
}
