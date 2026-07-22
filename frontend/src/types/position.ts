export interface Position {
  position_id: string;
  trader_wallet_address: string;
  symbol: string;
  quantity: number;
  direction: "LONG" | "SHORT";
  entry_price: number;
  leverage: number;
  stop_loss: number | null;
  take_profit: number | null;
  liquidation_price?: number;
  status: "OPEN" | "CLOSED" | "CANCELLED" | "LIQUIDATED";
  trade_source?: "OWN" | "COPY";
  copied_from_master?: string | null;
  copy_trade_position_id?: string | null;
  gross_pnl?: number | null;
  master_reward?: number | null;
  follower_reward?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePositionDTO {
  trader_wallet_address: string;
  symbol: string;
  quantity: number;
  direction: "LONG" | "SHORT";
  entry_price: number;
  leverage: number;
  liquidation_price?: number;
  stop_loss: number | null;
  take_profit: number | null;
  trade_source?: "OWN" | "COPY";
  copied_from_master?: string | null;
  copy_trade_position_id?: string | null;
}

export interface ClosedPosition {
  position_id: string;
  symbol: string;
  quantity: number;
  direction: "LONG" | "SHORT";
  entry_price: number;
  closing_price: number;
  leverage: number;
  Pnl: number;
  Roi: number;
  trade_source?: "OWN" | "COPY";
  copied_from_master?: string | null;
  copy_trade_position_id?: string | null;
  gross_pnl?: number | null;
  master_reward?: number | null;
  follower_reward?: number | null;
  created_at: string;
  updated_at: string;
  status: "CLOSED";
}

export interface ClosePositionDTO {
  position_id: string;
  trader_wallet_address: string;
  closing_price: number;
  updated_at: string;
  status: "OPEN" | "CLOSED";
  Pnl: number;
  Roi: number;
}

export interface UpdatePosition {
  position_id: string;
  trader_wallet_address: string;
  take_profit: number | null;
  stop_loss: number | null;
  // liquidation_price: number;
}
