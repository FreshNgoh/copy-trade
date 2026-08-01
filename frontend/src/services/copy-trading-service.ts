import {
  getEnabledCopyFollowers,
  openCopiedTradeOnChain,
} from "@/lib/web3/copy-trading/server";
import { copyTradingRepository } from "@/repositories/copy-trading-repository";
import { positionRepository } from "@/repositories/position-repository";
import { traderDashboardRepository } from "@/repositories/trader-dashboard-repository";
import type { CreatePositionDTO } from "@/types/position";

type CopyResult = {
  follower: string;
  copied: boolean;
  reason?: string;
};

export async function copyMasterPositionToFollowers(masterTrade: CreatePositionDTO): Promise<CopyResult[]> {
  const requestedMargin = getInitialMargin(masterTrade);

  if (requestedMargin <= 0) return [];

  const [savedSettings, savedFollowers] = await Promise.all([
    copyTradingRepository.getFollowersForMaster(masterTrade.trader_wallet_address),
    copyTradingRepository.getEnabledFollowers(masterTrade.trader_wallet_address),
  ]);
  const followers =
    savedSettings.length > 0
      ? savedFollowers
      : await getEnabledCopyFollowers(masterTrade.trader_wallet_address);
  const results: CopyResult[] = [];

  for (const { follower, maxCopyAmount, maxAllocationBps } of followers) {
    if (follower.toLowerCase() === masterTrade.trader_wallet_address.toLowerCase()) {
      continue;
    }

    try {
      const requestedCopyMargin = await getRequestedCopyMargin({
        follower,
        master: masterTrade.trader_wallet_address,
        requestedMargin,
        maxCopyAmount,
        maxAllocationBps,
      });

      if (requestedCopyMargin <= 0) {
        throw new Error("No copy wallet balance available");
      }

      const copiedTrade = await openCopiedTradeOnChain({
        follower,
        trader: masterTrade.trader_wallet_address,
        symbol: masterTrade.symbol,
        direction: masterTrade.direction,
        requestedMargin: requestedCopyMargin,
        entryPrice: Number(masterTrade.entry_price),
      });

      await openOrIncreaseCopiedPosition({
        masterTrade,
        follower,
        copiedMargin: copiedTrade.margin,
        copyTradePositionId: copiedTrade.copyPositionId,
      });
      await copyTradingRepository.saveCopySuccess({
        masterWalletAddress: masterTrade.trader_wallet_address,
        followerWalletAddress: follower,
        txHash: copiedTrade.txHash,
        copyPositionId: copiedTrade.copyPositionId,
      });

      results.push({ follower, copied: true });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await copyTradingRepository.saveCopyFailure({
        masterWalletAddress: masterTrade.trader_wallet_address,
        followerWalletAddress: follower,
        errorMessage: reason,
      });
      console.error("Failed to copy master position:", {
        follower,
        master: masterTrade.trader_wallet_address,
        symbol: masterTrade.symbol,
        reason,
      });
      results.push({ follower, copied: false, reason });
    }
  }

  return results;
}

async function getRequestedCopyMargin({
  follower,
  master,
  requestedMargin,
  maxCopyAmount,
  maxAllocationBps,
}: {
  follower: string;
  master: string;
  requestedMargin: number;
  maxCopyAmount?: number;
  maxAllocationBps?: number;
}) {
  const [portfolio, activeCopyMargin, activeMasterCopyMargin] =
    await Promise.all([
      traderDashboardRepository.ensurePortfolio(follower),
      positionRepository.getOpenCopiedMargin({ followerWalletAddress: follower }),
      positionRepository.getOpenCopiedMargin({
        followerWalletAddress: follower,
        masterWalletAddress: master,
      }),
    ]);
  const copyWalletBalance = Number(portfolio.copy_wallet_balance || 0);
  const copyFreeCollateral = copyWalletBalance - activeCopyMargin;
  const remainingMasterAllocation =
    Number(maxCopyAmount || 0) > 0
      ? Number(maxCopyAmount || 0) - activeMasterCopyMargin
      : copyFreeCollateral;
  const allocationLimit =
    Number(maxAllocationBps || 0) > 0
      ? (copyWalletBalance * Number(maxAllocationBps || 0)) / 10_000
      : copyFreeCollateral;

  return Math.min(
    requestedMargin,
    Math.max(copyFreeCollateral, 0),
    Math.max(remainingMasterAllocation, 0),
    Math.max(allocationLimit, 0),
  );
}

async function openOrIncreaseCopiedPosition({
  masterTrade,
  follower,
  copiedMargin,
  copyTradePositionId,
}: {
  masterTrade: CreatePositionDTO;
  follower: string;
  copiedMargin: number;
  copyTradePositionId: string;
}) {
  const entryPrice = Number(masterTrade.entry_price);
  const leverage = Number(masterTrade.leverage);
  const quantity = (copiedMargin * leverage) / entryPrice;
  const existingPosition = await positionRepository.getOpenCopiedPosition({
    followerWalletAddress: follower,
    masterWalletAddress: masterTrade.trader_wallet_address,
    symbol: masterTrade.symbol,
    direction: masterTrade.direction,
  });

  if (existingPosition) {
    const oldQuantity = Number(existingPosition.quantity);
    const oldEntryPrice = Number(existingPosition.entry_price);
    const nextQuantity = oldQuantity + quantity;
    const nextEntryPrice =
      (oldQuantity * oldEntryPrice + quantity * entryPrice) / nextQuantity;
    const existingIds = Array.isArray(existingPosition.copy_trade_position_ids)
      ? existingPosition.copy_trade_position_ids
      : existingPosition.copy_trade_position_id
        ? [existingPosition.copy_trade_position_id]
        : [];

    return positionRepository.updatePositionAfterFill({
      position_id: existingPosition.position_id,
      quantity: nextQuantity,
      entry_price: nextEntryPrice,
      leverage,
      copy_trade_position_ids: Array.from(
        new Set([...existingIds, copyTradePositionId]),
      ),
    });
  }

  const createdPosition = await positionRepository.createMarketOrder({
    trader_wallet_address: follower,
    symbol: masterTrade.symbol,
    quantity,
    direction: masterTrade.direction,
    entry_price: entryPrice,
    leverage,
    stop_loss: masterTrade.stop_loss,
    take_profit: masterTrade.take_profit,
    trade_source: "COPY",
    copied_from_master: masterTrade.trader_wallet_address,
    copy_trade_position_id: copyTradePositionId,
  });

  await syncOpenPositionCount(follower);

  return createdPosition;
}

async function syncOpenPositionCount(traderWalletAddress: string) {
  const openPositions = await positionRepository.getOpenPositions(traderWalletAddress);

  await traderDashboardRepository.updateOpenPositionCount({
    traderWalletAddress,
    positions: openPositions.length,
  });
}

function getInitialMargin(trade: CreatePositionDTO) {
  const quantity = Number(trade.quantity);
  const entryPrice = Number(trade.entry_price);
  const leverage = Number(trade.leverage);

  if (quantity <= 0 || entryPrice <= 0 || leverage <= 0) return 0;

  return (quantity * entryPrice) / leverage;
}
