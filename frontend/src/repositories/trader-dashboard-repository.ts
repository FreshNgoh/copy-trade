import { supabase } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export class TraderDashboardRepository {
  async getPortfolio(traderWalletAddress: string) {
    const { data: portfolio, error } = await supabase
      .from("portfolio")
      .select("*")
      .ilike("trader_wallet_address", traderWalletAddress)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return portfolio;
  }

  async ensurePortfolio(traderWalletAddress: string) {
    const existingPortfolio = await this.getPortfolio(traderWalletAddress);

    if (existingPortfolio) {
      return existingPortfolio;
    }

    const { data: portfolio, error } = await supabase
      .from("portfolio")
      .insert({
        trader_id: randomUUID(),
        trader_wallet_address: traderWalletAddress,
        wallet_balance: 0,
        positions: 0,
        followers: 0,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return portfolio;
  }

  async addWalletBalance({
    traderWalletAddress,
    amount,
  }: {
    traderWalletAddress: string;
    amount: number;
  }) {
    const portfolio = await this.ensurePortfolio(traderWalletAddress);
    const nextBalance = Number(portfolio.wallet_balance || 0) + amount;

    const { data: updatedPortfolio, error } = await supabase
      .from("portfolio")
      .update({
        wallet_balance: nextBalance,
      })
      .ilike("trader_wallet_address", traderWalletAddress)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return updatedPortfolio;
  }

  async updateOpenPositionCount({
    traderWalletAddress,
    positions,
  }: {
    traderWalletAddress: string;
    positions: number;
  }) {
    await this.ensurePortfolio(traderWalletAddress);

    const { data: portfolio, error } = await supabase
      .from("portfolio")
      .update({
        positions,
      })
      .ilike("trader_wallet_address", traderWalletAddress)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return portfolio;
  }

  async getPositions(traderWalletAddress: string) {
    const { data: positions, error } = await supabase
      .from("positions")
      .select("*")
      .order("created_at", { ascending: false })
      .ilike("trader_wallet_address", traderWalletAddress);

    if (error) {
      throw error;
    }

    return positions ?? [];
  }

  async getOpenOrders(traderWalletAddress: string) {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .ilike("trader_wallet_address", traderWalletAddress)
      .in("status", ["PENDING", "PARTIALLY_FILLED"]);

    if (error) {
      throw error;
    }

    return orders ?? [];
  }

  async getVerifiedMasterTraders() {
    const { data: portfolios, error } = await supabase
      .from("portfolio")
      .select(
        "trader_id,trader_wallet_address,wallet_balance,followers,is_verified_master,master_verified_at,master_verification_tx_hash,master_total_trades,master_roi,master_trading_volume",
      )
      .eq("is_verified_master", true)
      .order("master_roi", { ascending: false });

    if (error) {
      throw error;
    }

    return portfolios ?? [];
  }

  async markMasterVerificationPending(traderWalletAddress: string) {
    await this.ensurePortfolio(traderWalletAddress);

    const { data: portfolio, error } = await supabase
      .from("portfolio")
      .update({
        master_status: "PENDING",
        master_verification_error: null,
      })
      .ilike("trader_wallet_address", traderWalletAddress)
      .eq("is_verified_master", false)
      .neq("master_status", "PENDING")
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return portfolio;
  }

  async saveMasterVerificationSuccess({
    traderWalletAddress,
    txHash,
    blockNumber,
    totalTrades,
    roi,
    tradingVolume,
  }: {
    traderWalletAddress: string;
    txHash: string;
    blockNumber: number | null;
    totalTrades: number;
    roi: number;
    tradingVolume: number;
  }) {
    const { data: portfolio, error } = await supabase
      .from("portfolio")
      .update({
        master_status: "VERIFIED",
        is_verified_master: true,
        master_verified_at: new Date().toISOString(),
        master_verification_tx_hash: txHash,
        master_verification_block: blockNumber,
        master_verification_error: null,
        master_total_trades: totalTrades,
        master_roi: roi,
        master_trading_volume: tradingVolume,
      })
      .ilike("trader_wallet_address", traderWalletAddress)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return portfolio;
  }

  async saveMasterVerificationFailure({
    traderWalletAddress,
    errorMessage,
  }: {
    traderWalletAddress: string;
    errorMessage: string;
  }) {
    const { data: portfolio, error } = await supabase
      .from("portfolio")
      .update({
        master_status: "FAILED",
        master_verification_error: errorMessage,
      })
      .ilike("trader_wallet_address", traderWalletAddress)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return portfolio;
  }
}

export const traderDashboardRepository = new TraderDashboardRepository();
