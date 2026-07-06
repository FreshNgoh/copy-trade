import { supabase } from "@/lib/supabase/server";
import {
  ClosePositionDTO,
  CreatePositionDTO,
  UpdatePosition,
} from "@/types/position";

export class PositionRepository {
  async createMarketOrder(data: CreatePositionDTO) {
    const { data: position, error } = await supabase
      .from("positions")
      .insert({
        trader_wallet_address: data.trader_wallet_address,
        symbol: data.symbol,
        quantity: data.quantity,
        direction: data.direction,
        entry_price: data.entry_price,
        leverage: data.leverage,
        stop_loss: data.stop_loss,
        take_profit: data.take_profit,
        created_at: new Date(),
        updated_at: new Date(),
        status: "OPEN",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }
    return position;
  }

  async getOpenPositions(traderWalletAddress: string) {
    const { data: positions, error } = await supabase
      .from("positions")
      .select("*")
      .order("created_at", { ascending: false })
      .eq("trader_wallet_address", traderWalletAddress)
      .eq("status", "OPEN");

    if (error) {
      throw error;
    }
    return positions;
  }

  async closePosition(data: ClosePositionDTO) {
    const { data: position, error } = await supabase
      .from("positions")
      .update({
        closing_price: data.closing_price,
        updated_at: data.updated_at,
        status: "CLOSED",
        Pnl: data.Pnl,
        Roi: data.Roi,
      })
      .eq("position_id", data.position_id)
      .eq("trader_wallet_address", data.trader_wallet_address)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return position;
  }

  async getClosedPositions(traderWalletAddress: string) {
    const { data: positions, error } = await supabase
      .from("positions")
      .select("*")
      .order("created_at", { ascending: false })
      .eq("trader_wallet_address", traderWalletAddress)
      .eq("status", "CLOSED");

    if (error) {
      throw error;
    }
    return positions;
  }

  async updatePosition(data: UpdatePosition) {
    const { data: positions, error } = await supabase
      .from("positions")
      .update({
        take_profit: data.take_profit,
        stop_loss: data.stop_loss,
      })
      .eq("position_id", data.position_id)
      .eq("trader_wallet_address", data.trader_wallet_address)
      .select()
      .single();
    if (error) {
      throw error;
    }
    return positions;
  }
}

export const positionRepository = new PositionRepository();
