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

  async getOpenPositionsBySymbol(symbol: string) {
    const { data: positions, error } = await supabase
      .from("positions")
      .select("*")
      .order("created_at", { ascending: true })
      .eq("symbol", symbol)
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
      .eq("status", "OPEN")
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

  async getOpenPosition({
    trader_wallet_address,
    symbol,
    direction,
  }: {
    trader_wallet_address: string;
    symbol: string;
    direction: "LONG" | "SHORT";
  }) {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .eq("trader_wallet_address", trader_wallet_address)
      .eq("symbol", symbol)
      .eq("direction", direction)
      .eq("status", "OPEN")
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async updatePositionAfterFill({
    position_id,
    quantity,
    entry_price,
  }: {
    position_id: string;
    quantity: number;
    entry_price: number;
  }) {
    const { data, error } = await supabase
      .from("positions")
      .update({
        quantity,
        entry_price,
        updated_at: new Date().toISOString(),
      })
      .eq("position_id", position_id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}

export const positionRepository = new PositionRepository();
