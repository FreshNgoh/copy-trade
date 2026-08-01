import { getAddress } from "ethers";
import {
  parseDirection,
  parseScaledInteger,
  stringToBytes32,
  toUnixTimestamp
} from "../blockchain/trade-history-format.js";
import { TradeHistoryService, type TradeRecordInput } from "../blockchain/trade-history-service.js";

export type ClosedOrder = {
  id: string;
  userWallet: string;
  symbol: string;
  direction: "long" | "short" | "LONG" | "SHORT";
  quantity: string | number;
  entryPrice: string | number;
  closingPrice: string | number;
  pnl: string | number;
  roi: string | number;
  openTime: string | Date;
  closedTime: string | Date;
  onChainTradeId?: string | null;
  onChainTxHash?: string | null;
  onChainSynced?: boolean;
};

export type ClosedOrderRepository = {
  getClosedOrderById(orderId: string): Promise<ClosedOrder | null>;

  /**
   * Should atomically mark an order as "syncing" only when it is closed and not already synced.
   * Example Mongo filter:
   * { id: orderId, status: "CLOSED", onChainSynced: { $ne: true }, onChainSyncing: { $ne: true } }
   */
  markOnChainSyncing(orderId: string): Promise<boolean>;

  saveOnChainSyncSuccess(input: {
    orderId: string;
    onChainTradeId: string;
    onChainTxHash: string;
    onChainSyncedAt: Date;
  }): Promise<void>;

  saveOnChainSyncFailure(input: { orderId: string; error: string }): Promise<void>;
};

export const TRADE_HISTORY_DECIMALS = {
  quantity: 6,
  price: 2,
  pnl: 2,
  roi: 4
} as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function buildTradeRecordFromClosedOrder(order: ClosedOrder): TradeRecordInput {
  return {
    user: getAddress(order.userWallet),
    master: ZERO_ADDRESS,
    follower: ZERO_ADDRESS,
    openTime: toUnixTimestamp(order.openTime),
    closedTime: toUnixTimestamp(order.closedTime),
    direction: parseDirection(order.direction),
    source: 0,
    quantityDecimals: TRADE_HISTORY_DECIMALS.quantity,
    priceDecimals: TRADE_HISTORY_DECIMALS.price,
    pnlDecimals: TRADE_HISTORY_DECIMALS.pnl,
    roiDecimals: TRADE_HISTORY_DECIMALS.roi,
    symbol: stringToBytes32(order.symbol),
    quantity: parseScaledInteger(order.quantity, TRADE_HISTORY_DECIMALS.quantity),
    entryPrice: parseScaledInteger(order.entryPrice, TRADE_HISTORY_DECIMALS.price),
    closingPrice: parseScaledInteger(order.closingPrice, TRADE_HISTORY_DECIMALS.price),
    pnl: parseScaledInteger(order.pnl, TRADE_HISTORY_DECIMALS.pnl),
    roi: parseScaledInteger(order.roi, TRADE_HISTORY_DECIMALS.roi),
    grossPnl: parseScaledInteger(order.pnl, TRADE_HISTORY_DECIMALS.pnl),
    masterReward: 0n,
    followerReward: 0n
  };
}

export async function syncClosedOrderToTradeHistory(input: {
  orderId: string;
  orders: ClosedOrderRepository;
  tradeHistory?: TradeHistoryService;
}) {
  const { orderId, orders } = input;
  const tradeHistory = input.tradeHistory ?? new TradeHistoryService();

  const lockedForSync = await orders.markOnChainSyncing(orderId);

  if (!lockedForSync) {
    return {
      skipped: true,
      reason: "Order is already synced, currently syncing, or not closed"
    };
  }

  try {
    const order = await orders.getClosedOrderById(orderId);

    if (!order) {
      throw new Error(`Closed order not found: ${orderId}`);
    }

    if (order.onChainSynced || order.onChainTradeId || order.onChainTxHash) {
      return {
        skipped: true,
        reason: "Order already has on-chain trade metadata"
      };
    }

    const record = buildTradeRecordFromClosedOrder(order);
    const result = await tradeHistory.addTradeRecord(record);

    await orders.saveOnChainSyncSuccess({
      orderId,
      onChainTradeId: result.tradeId.toString(),
      onChainTxHash: result.txHash,
      onChainSyncedAt: new Date()
    });

    return {
      skipped: false,
      tradeId: result.tradeId.toString(),
      txHash: result.txHash,
      blockNumber: result.blockNumber
    };
  } catch (error) {
    await orders.saveOnChainSyncFailure({
      orderId,
      error: error instanceof Error ? error.message : String(error)
    });

    throw error;
  }
}
