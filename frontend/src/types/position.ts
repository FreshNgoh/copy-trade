export interface CreatePositionDTO {
  order_id?: string;
  trader_wallet_address: string;
  symbol: string;
  quantity: number;
  direction: "LONG" | "SHORT";
  entry_price: number;
  leverage: number;
  stop_loss: number | null;
  take_profit: number | null;
  created_at?: Date;
  updated_at?: Date;
  status?: "OPEN" | "CLOSED" | "CANCELLED" | "LIQUIDATED";
  liquidation_price?: number;
}

export interface ClosePosition {
  position_id: string;
  closing_price: number;
  updated_at: Date;
  status: "OPEN" | "CLOSED";
  Pnl: number;
  Roi: number;
}

export interface UpdatePosition {
  position_id: string;
  take_profit: number | null;
  stop_loss: number | null;
  // liquidation_price: number;
}
