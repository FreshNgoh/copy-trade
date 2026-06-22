import { orderRepository } from "@/repositories/order-repository";
import { positionRepository } from "@/repositories/position-repository";
import {
  CancelLimitOrder,
  CreateOrderDTO,
  UpdateLimitOrder,
} from "@/types/limit-order";
import { createPosition } from "./position-service";

export async function createOrder(data: CreateOrderDTO) {
  const order = await orderRepository.createLimitOrder(data);

  if (data.order_type === "MARKET") {
    const position = await positionRepository.createMarketOrder({
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

export async function getLimitOrderPositions() {
  return orderRepository.getLimitOrderPositions();
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

    await createPosition({
      trader_wallet_address: order.trader_wallet_address,
      symbol: order.symbol,
      quantity: canFillQty,
      direction: order.direction,
      entry_price: entryPrice,
      leverage: order.leverage,
      stop_loss: order.stop_loss,
      take_profit: order.take_profit,
    });

    await updateLimitOrder({
      order_id: order.order_id,
      filled_quantity: nextFilledQuantity,
      updated_at: new Date().toISOString(),
      status: orderStatus,
    });
  }
}
