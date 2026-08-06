import { type Address, type PublicClient } from "viem";
import { tradeHistoryAbi } from "./abi";
import {
  TRADE_HISTORY_CONTRACT_ADDRESS,
  TRADE_HISTORY_DEPLOYMENT_BLOCK,
} from "./constants";
import type { OnChainTradeRecord } from "./types";

export async function readUserTradeHistoryRecords({
  publicClient,
  user,
  limit,
}: {
  publicClient: PublicClient;
  user: Address;
  limit?: number;
}): Promise<OnChainTradeRecord[]> {
  if (!TRADE_HISTORY_CONTRACT_ADDRESS) return [];

  const tradeIds = await publicClient.readContract({
    address: TRADE_HISTORY_CONTRACT_ADDRESS,
    abi: tradeHistoryAbi,
    functionName: "getUserTradeIds",
    args: [user],
  });
  const selectedTradeIds = limit ? tradeIds.slice(-limit) : tradeIds;

  const latestBlock = await publicClient.getBlockNumber();

  return Promise.all(
    selectedTradeIds.map(async (tradeId) => {
      const record = await publicClient.readContract({
        address: TRADE_HISTORY_CONTRACT_ADDRESS,
        abi: tradeHistoryAbi,
        functionName: "getTradeRecord",
        args: [tradeId],
      });
      const blockNumber = await findTradeCreatedBlock({
        publicClient,
        tradeId,
        latestBlock,
      });

      return {
        tradeId,
        blockNumber,
        transactionHash: null,
        user: record.user,
        master: record.master,
        follower: record.follower,
        openTime: record.openTime,
        closedTime: record.closedTime,
        direction: record.direction,
        source: record.source,
        quantityDecimals: record.quantityDecimals,
        priceDecimals: record.priceDecimals,
        pnlDecimals: record.pnlDecimals,
        roiDecimals: record.roiDecimals,
        symbol: record.symbol,
        quantity: record.quantity,
        entryPrice: record.entryPrice,
        closingPrice: record.closingPrice,
        pnl: record.pnl,
        roi: record.roi,
        grossPnl: record.grossPnl,
        masterReward: record.masterReward,
        followerReward: record.followerReward,
        orderHash: record.orderHash,
      } satisfies OnChainTradeRecord;
    }),
  );
}

async function findTradeCreatedBlock({
  publicClient,
  tradeId,
  latestBlock,
}: {
  publicClient: PublicClient;
  tradeId: bigint;
  latestBlock: bigint;
}) {
  if (!TRADE_HISTORY_CONTRACT_ADDRESS) return null;

  let low = TRADE_HISTORY_DEPLOYMENT_BLOCK;
  let high = latestBlock;
  let found: bigint | null = null;

  while (low <= high) {
    const mid = (low + high) / 2n;
    const exists = await tradeExistsAtBlock(publicClient, tradeId, mid);

    if (exists) {
      found = mid;
      high = mid - 1n;
    } else {
      low = mid + 1n;
    }
  }

  return found;
}

async function tradeExistsAtBlock(
  publicClient: PublicClient,
  tradeId: bigint,
  blockNumber: bigint,
) {
  if (!TRADE_HISTORY_CONTRACT_ADDRESS) return false;

  try {
    await publicClient.readContract({
      address: TRADE_HISTORY_CONTRACT_ADDRESS,
      abi: tradeHistoryAbi,
      functionName: "getTradeRecord",
      args: [tradeId],
      blockNumber,
    });

    return true;
  } catch {
    return false;
  }
}
