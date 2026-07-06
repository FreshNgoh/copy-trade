export interface CreateOrderDTO {
  trader_wallet_address: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  order_type: "MARKET" | "LIMIT";
  quantity: number;
  limit_price?: number | null;
  leverage: number;
  stop_loss: number | null;
  take_profit: number | null;
}

export interface LimitOrder {
  order_id: string;
  trader_wallet_address: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  order_type: "MARKET" | "LIMIT";
  limit_price: number | null;
  quantity: number;
  filled_quantity: number;
  average_fill_price: number | null;
  leverage: number;
  stop_loss: number | null;
  take_profit: number | null;
  status: "PENDING" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED" | "EXPIRED";
  created_at: string;
  updated_at: string;
}

export interface CancelLimitOrder {
  order_id: string;
  trader_wallet_address: string;
  updated_at: Date;
  status: "CANCELLED";
}

export interface UpdateLimitOrder {
  order_id: string;
  filled_quantity: number;
  updated_at: string;
  status: "FILLED" | "PARTIALLY_FILLED";
}
