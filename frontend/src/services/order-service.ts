import { orderRepository } from "@/repositories/order-repository";
import { positionRepository } from "@/repositories/position-repository";
import { CancelLimitOrder, CreateOrderDTO } from "@/types/limit-order";

export async function createOrder(data: CreateOrderDTO) {
  const order = await orderRepository.createLimitOrder(data);

  if (data.order_type === "MARKET") {
    const position = await positionRepository.createMarketOrder({
      order_id: order.order_id,
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

export async function cancelLimitOrder(order: CancelLimitOrder) {
  return orderRepository.cancelLimitOrder(order);
}
