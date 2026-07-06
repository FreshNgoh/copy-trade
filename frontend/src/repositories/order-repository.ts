import { supabase } from "@/lib/supabase/server";
import {
  CancelLimitOrder,
  CreateOrderDTO,
  UpdateLimitOrder,
} from "@/types/limit-order";

export class OrderRepository {
  async createLimitOrder(data: CreateOrderDTO) {
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        trader_wallet_address: data.trader_wallet_address,
        symbol: data.symbol,
        direction: data.direction,
        order_type: data.order_type,
        limit_price: data.limit_price,
        quantity: data.quantity,
        filled_quantity: data.order_type === "MARKET" ? data.quantity : 0,
        average_fill_price: 0,
        leverage: data.leverage,
        stop_loss: data.stop_loss,
        take_profit: data.take_profit,
        created_at: new Date(),
        updated_at: new Date(),
        status: data.order_type === "MARKET" ? "FILLED" : "PENDING",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }
    return order;
  }

  async getLimitOrderPositions(traderWalletAddress: string) {
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .eq("trader_wallet_address", traderWalletAddress)
      .in("status", ["PENDING", "PARTIALLY_FILLED"]);

    if (error) {
      throw error;
    }
    return order;
  }

  async getPendingOrders(symbol: string) {
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["PENDING", "PARTIALLY_FILLED"])
      .eq("symbol", symbol);

    if (error) {
      throw error;
    }
    return order;
  }

  async cancelLimitOrder(data: CancelLimitOrder) {
    const { data: order, error } = await supabase
      .from("orders")
      .update({
        updated_at: data.updated_at,
        status: "CANCELLED",
      })
      .eq("order_id", data.order_id)
      .eq("trader_wallet_address", data.trader_wallet_address)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return order;
  }

  async updateLimitOrder(data: UpdateLimitOrder) {
    const { data: order, error } = await supabase
      .from("orders")
      .update({
        filled_quantity: data.filled_quantity,
        updated_at: data.updated_at,
        status: data.status,
      })
      .eq("order_id", data.order_id)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return order;
  }
}

export const orderRepository = new OrderRepository();
