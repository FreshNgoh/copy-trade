import { orderRepository } from "@/repositories/order-repository";
import { positionRepository } from "@/repositories/position-repository";
import {
  CancelLimitOrder,
  CreateOrderDTO,
  UpdateLimitOrder,
} from "@/types/limit-order";
import {
  assertSufficientFreeCollateral,
  closePosition,
  openOrIncreasePosition,
} from "./position-service";

function calculateClosedPositionMetrics({
  direction,
  entryPrice,
  closingPrice,
  quantity,
  leverage,
}: {
  direction: "LONG" | "SHORT";
  entryPrice: number;
  closingPrice: number;
  quantity: number;
  leverage: number;
}) {
  const pnl =
    direction === "LONG"
      ? (closingPrice - entryPrice) * quantity
      : (entryPrice - closingPrice) * quantity;
  const roi = (pnl / (entryPrice * quantity)) * leverage * 100;

  return { pnl, roi };
}

export async function createOrder(data: CreateOrderDTO) {
  const entryPrice = Number(data.limit_price);

  if (!Number.isFinite(Number(data.quantity)) || Number(data.quantity) <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  if (!Number.isFinite(Number(data.leverage)) || Number(data.leverage) <= 0) {
    throw new Error("Leverage must be greater than 0");
  }

  if (
    data.order_type === "LIMIT" &&
    (!Number.isFinite(entryPrice) || entryPrice <= 0)
  ) {
    throw new Error("Limit price must be greater than 0");
  }

  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    throw new Error("Entry price must be greater than 0");
  }

  await assertSufficientFreeCollateral({
    trader_wallet_address: data.trader_wallet_address,
    symbol: data.symbol,
    quantity: data.quantity,
    direction: data.direction,
    entry_price: entryPrice,
    leverage: data.leverage,
    stop_loss: data.stop_loss,
    take_profit: data.take_profit,
  });

  const order = await orderRepository.createLimitOrder(data);

  if (data.order_type === "MARKET") {
    const position = await openOrIncreasePosition({
      trader_wallet_address: data.trader_wallet_address,
      symbol: data.symbol,
      quantity: data.quantity,
      direction: data.direction,
      entry_price: data.limit_price,
      leverage: data.leverage,
      stop_loss: data.stop_loss,
      take_profit: data.take_profit,
    });

    return { order, position };
  }

  return { order };
}

export async function getLimitOrderPositions(traderWalletAddress: string) {
  return orderRepository.getLimitOrderPositions(traderWalletAddress);
}

export async function getPendingOrders(symbol: string) {
  return orderRepository.getPendingOrders(symbol);
}

export async function cancelLimitOrder(order: CancelLimitOrder) {
  return orderRepository.cancelLimitOrder(order);
}

export async function updateLimitOrder(order: UpdateLimitOrder) {
  return orderRepository.updateLimitOrder(order);
}

export async function processTriggeredPositions({
  symbol,
  bestBid,
  bestAsk,
}: {
  symbol: string;
  bestBid: number;
  bestAsk: number;
}) {
  const openPositions =
    await positionRepository.getOpenPositionsBySymbol(symbol);

  for (const position of openPositions) {
    const takeProfit = Number(position.take_profit);
    const stopLoss = Number(position.stop_loss);
    const entryPrice = Number(position.entry_price);
    const quantity = Number(position.quantity);
    const leverage = Number(position.leverage);
    const closePrice = position.direction === "LONG" ? bestBid : bestAsk;

    if (closePrice <= 0 || entryPrice <= 0 || quantity <= 0 || leverage <= 0) {
      continue;
    }

    const hasTakeProfit = Number.isFinite(takeProfit) && takeProfit > 0;
    const hasStopLoss = Number.isFinite(stopLoss) && stopLoss > 0;

    const takeProfitMatched =
      hasTakeProfit &&
      (position.direction === "LONG"
        ? closePrice >= takeProfit
        : closePrice <= takeProfit);
    const stopLossMatched =
      hasStopLoss &&
      (position.direction === "LONG"
        ? closePrice <= stopLoss
        : closePrice >= stopLoss);

    if (!takeProfitMatched && !stopLossMatched) continue;

    const { pnl, roi } = calculateClosedPositionMetrics({
      direction: position.direction,
      entryPrice,
      closingPrice: closePrice,
      quantity,
      leverage,
    });

    await closePosition({
      position_id: position.position_id,
      trader_wallet_address: position.trader_wallet_address,
      closing_price: closePrice,
      updated_at: new Date().toISOString(),
      status: "CLOSED",
      Pnl: pnl,
      Roi: roi,
    });
  }
}

export async function processPendingOrders({
  symbol,
  bestBid,
  bestAsk,
  askQty,
  bidQty,
}: {
  symbol: string;
  bestBid: number;
  bestAsk: number;
  askQty: number;
  bidQty: number;
}) {
  await processTriggeredPositions({ symbol, bestBid, bestAsk });

  const pendingOrders = await getPendingOrders(symbol);

  for (const order of pendingOrders) {
    const limitPrice = Number(order.limit_price);
    const orderQuantity = Number(order.quantity);
    const filledQuantity = Number(order.filled_quantity || 0);
    const remainingQuantity = orderQuantity - filledQuantity;

    if (remainingQuantity <= 0 || !Number.isFinite(limitPrice)) continue;

    const isBuyMatched =
      order.direction === "LONG" && bestAsk > 0 && bestAsk <= limitPrice;
    const isSellMatched =
      order.direction === "SHORT" && bestBid > 0 && bestBid >= limitPrice;
    const execution = isBuyMatched || isSellMatched;

    if (!execution) continue;

    const canFillQty =
      order.direction === "LONG"
        ? Math.min(remainingQuantity, askQty)
        : Math.min(remainingQuantity, bidQty);

    if (canFillQty <= 0) continue;

    const entryPrice = order.direction === "LONG" ? bestAsk : bestBid;
    const nextFilledQuantity = filledQuantity + canFillQty;
    const remainingQty = orderQuantity - nextFilledQuantity;
    const orderStatus = remainingQty <= 0 ? "FILLED" : "PARTIALLY_FILLED";

    try {
      await openOrIncreasePosition({
        trader_wallet_address: order.trader_wallet_address,
        symbol: order.symbol,
        quantity: canFillQty,
        direction: order.direction,
        entry_price: entryPrice,
        leverage: order.leverage,
        stop_loss: order.stop_loss,
        take_profit: order.take_profit,
      });
    } catch (error) {
      console.error("Failed to fill matched order:", error);
      continue;
    }

    await updateLimitOrder({
      order_id: order.order_id,
      filled_quantity: nextFilledQuantity,
      updated_at: new Date().toISOString(),
      status: orderStatus,
    });
  }
}
