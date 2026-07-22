import { supabase } from "@/lib/supabase/server";
import {
  ClosePositionDTO,
  CreatePositionDTO,
  UpdatePosition,
} from "@/types/position";

export class PositionRepository {
  async getCopiedPositionsForMaster(masterWalletAddress: string) {
    const { data, error } = await supabase
      .from("positions")
      .select(
        "position_id,trader_wallet_address,status,Pnl,follower_reward,master_reward,created_at,updated_at",
      )
      .ilike("copied_from_master", masterWalletAddress)
      .eq("trade_source", "COPY");

    if (error) throw error;
    return data ?? [];
  }

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
        trade_source: data.trade_source ?? "OWN",
        copied_from_master: data.copied_from_master ?? null,
        copy_trade_position_id: data.copy_trade_position_id ?? null,
        copy_trade_position_ids: data.copy_trade_position_id
          ? [data.copy_trade_position_id]
          : [],
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

  async getOpenCopiedMargin({
    followerWalletAddress,
    masterWalletAddress,
  }: {
    followerWalletAddress: string;
    masterWalletAddress?: string;
  }) {
    let query = supabase
      .from("positions")
      .select("quantity,entry_price,leverage")
      .ilike("trader_wallet_address", followerWalletAddress)
      .eq("trade_source", "COPY")
      .eq("status", "OPEN");

    if (masterWalletAddress) {
      query = query.ilike("copied_from_master", masterWalletAddress);
    }

    const { data: positions, error } = await query;

    if (error) {
      throw error;
    }

    return (positions ?? []).reduce((total, position) => {
      const leverage = Number(position.leverage);
      if (leverage <= 0) return total;

      return (
        total +
        (Number(position.quantity) * Number(position.entry_price)) / leverage
      );
    }, 0);
  }

  async getOpenManualMargin({
    traderWalletAddress,
  }: {
    traderWalletAddress: string;
  }) {
    const { data: positions, error } = await supabase
      .from("positions")
      .select("quantity,entry_price,leverage,trade_source,copied_from_master")
      .ilike("trader_wallet_address", traderWalletAddress)
      .eq("status", "OPEN");

    if (error) throw error;

    return (positions ?? [])
      .filter(
        (position) =>
          position.trade_source !== "MASTER_COPY" &&
          position.trade_source !== "COPY" &&
          !position.copied_from_master,
      )
      .reduce((total, position) => {
      const leverage = Number(position.leverage);
      return leverage > 0
        ? total +
            (Number(position.quantity) * Number(position.entry_price)) /
              leverage
        : total;
      }, 0);
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

  async markRewardsSettled({
    positionId,
    grossPnl,
    masterReward,
    followerReward,
  }: {
    positionId: string;
    grossPnl: number;
    masterReward: number;
    followerReward: number;
  }) {
    const { data, error } = await supabase
      .from("positions")
      .update({
        gross_pnl: grossPnl,
        master_reward: masterReward,
        follower_reward: followerReward,
        rewards_settled: true,
        reward_settled_at: new Date().toISOString(),
      })
      .eq("position_id", positionId)
      .eq("status", "CLOSED")
      .or("rewards_settled.is.null,rewards_settled.eq.false")
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean(data);
  }

  async resetRewardsSettlement(positionId: string) {
    const { error } = await supabase
      .from("positions")
      .update({
        rewards_settled: false,
        reward_settled_at: null,
      })
      .eq("position_id", positionId)
      .eq("status", "CLOSED");

    if (error) throw error;
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
    trade_source = "OWN",
  }: {
    trader_wallet_address: string;
    symbol: string;
    direction: "LONG" | "SHORT";
    trade_source?: "OWN" | "MASTER_COPY";
  }) {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .eq("trader_wallet_address", trader_wallet_address)
      .eq("symbol", symbol)
      .eq("direction", direction)
      .eq("status", "OPEN")
      .eq("trade_source", trade_source)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async updatePositionAfterFill({
    position_id,
    quantity,
    entry_price,
    leverage,
    copy_trade_position_ids,
  }: {
    position_id: string;
    quantity: number;
    entry_price: number;
    leverage?: number;
    copy_trade_position_ids?: string[];
  }) {
    const updates: Record<string, unknown> = {
      quantity,
      entry_price,
      updated_at: new Date().toISOString(),
    };
    if (leverage !== undefined) updates.leverage = leverage;
    if (copy_trade_position_ids !== undefined) {
      updates.copy_trade_position_ids = copy_trade_position_ids;
    }

    const { data, error } = await supabase
      .from("positions")
      .update(updates)
      .eq("position_id", position_id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async getOpenCopiedPosition({
    followerWalletAddress,
    masterWalletAddress,
    symbol,
    direction,
  }: {
    followerWalletAddress: string;
    masterWalletAddress: string;
    symbol: string;
    direction: "LONG" | "SHORT";
  }) {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .ilike("trader_wallet_address", followerWalletAddress)
      .ilike("copied_from_master", masterWalletAddress)
      .eq("symbol", symbol)
      .eq("direction", direction)
      .eq("trade_source", "COPY")
      .eq("status", "OPEN")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async updateCopiedPositionsTpSl({
    masterWalletAddress,
    symbol,
    direction,
    takeProfit,
    stopLoss,
  }: {
    masterWalletAddress: string;
    symbol: string;
    direction: "LONG" | "SHORT";
    takeProfit: number | null;
    stopLoss: number | null;
  }) {
    const { error } = await supabase
      .from("positions")
      .update({ take_profit: takeProfit, stop_loss: stopLoss })
      .ilike("copied_from_master", masterWalletAddress)
      .eq("symbol", symbol)
      .eq("direction", direction)
      .eq("trade_source", "COPY")
      .eq("status", "OPEN");

    if (error) throw error;
  }
}

export const positionRepository = new PositionRepository();
