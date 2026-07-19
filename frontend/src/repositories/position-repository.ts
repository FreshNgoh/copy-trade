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
        liquidation_price: data.liquidation_price,
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
      .ilike("trader_wallet_address", data.trader_wallet_address)
      .eq("status", "OPEN")
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!position) {
      const existingClosedPosition = await this.getClosedPositionById({
        positionId: data.position_id,
        traderWalletAddress: data.trader_wallet_address,
      });

      if (existingClosedPosition) {
        return existingClosedPosition;
      }

      throw new Error(
        "Open position not found. It may already be closed, or the wallet address does not match this position.",
      );
    }

    return position;
  }

  async markOnChainSyncing(positionId: string) {
    const { data, error } = await supabase
      .from("positions")
      .update({
        on_chain_syncing: true,
        on_chain_sync_error: null,
      })
      .eq("position_id", positionId)
      .eq("status", "CLOSED")
      .or("on_chain_synced.is.null,on_chain_synced.eq.false")
      .or("on_chain_syncing.is.null,on_chain_syncing.eq.false")
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean(data);
  }

  async saveOnChainSyncSuccess({
    positionId,
    tradeId,
    txHash,
  }: {
    positionId: string;
    tradeId: string;
    txHash: string;
  }) {
    const { error } = await supabase
      .from("positions")
      .update({
        on_chain_synced: true,
        on_chain_syncing: false,
        on_chain_trade_id: tradeId,
        on_chain_tx_hash: txHash,
        on_chain_synced_at: new Date().toISOString(),
        on_chain_sync_error: null,
      })
      .eq("position_id", positionId);

    if (error) {
      throw error;
    }
  }

  async saveOnChainSyncFailure({
    positionId,
    errorMessage,
  }: {
    positionId: string;
    errorMessage: string;
  }) {
    const { error } = await supabase
      .from("positions")
      .update({
        on_chain_syncing: false,
        on_chain_sync_error: errorMessage,
      })
      .eq("position_id", positionId);

    if (error) {
      throw error;
    }
  }

  async getClosedPositions(traderWalletAddress: string) {
    const { data: positions, error } = await supabase
      .from("positions")
      .select("*")
      .order("created_at", { ascending: false })
      .ilike("trader_wallet_address", traderWalletAddress)
      .eq("status", "CLOSED");

    if (error) {
      throw error;
    }
    return positions;
  }

  async getClosedPositionsForTrader(traderWalletAddress: string) {
    const { data: positions, error } = await supabase
      .from("positions")
      .select("position_id,quantity,entry_price,Roi,status")
      .ilike("trader_wallet_address", traderWalletAddress)
      .eq("status", "CLOSED");

    if (error) {
      throw error;
    }

    return positions ?? [];
  }

  async getClosedPositionById({
    positionId,
    traderWalletAddress,
  }: {
    positionId: string;
    traderWalletAddress: string;
  }) {
    const { data: position, error } = await supabase
      .from("positions")
      .select("*")
      .eq("position_id", positionId)
      .ilike("trader_wallet_address", traderWalletAddress)
      .eq("status", "CLOSED")
      .maybeSingle();

    if (error) {
      throw error;
    }

    return position;
  }

  async getOnChainSyncStatus({
    positionId,
    traderWalletAddress,
  }: {
    positionId: string;
    traderWalletAddress: string;
  }) {
    const { data: position, error } = await supabase
      .from("positions")
      .select(
        "position_id,status,trader_wallet_address,on_chain_synced,on_chain_syncing,on_chain_trade_id,on_chain_tx_hash,on_chain_synced_at,on_chain_sync_error",
      )
      .eq("position_id", positionId)
      .ilike("trader_wallet_address", traderWalletAddress)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return position;
  }

  async updatePosition(data: UpdatePosition) {
    const { data: positions, error } = await supabase
      .from("positions")
      .update({
        take_profit: data.take_profit,
        stop_loss: data.stop_loss,
      })
      .eq("position_id", data.position_id)
      .ilike("trader_wallet_address", data.trader_wallet_address)
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
    liquidation_price,
  }: {
    position_id: string;
    quantity: number;
    entry_price: number;
    liquidation_price: number;
  }) {
    const { data, error } = await supabase
      .from("positions")
      .update({
        quantity,
        entry_price,
        liquidation_price,
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
