import { supabase } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export class TraderDashboardRepository {
  async getPortfolio(traderWalletAddress: string) {
    const { data: portfolio, error } = await supabase
      .from("portfolio")
      .select("*")
      .eq("trader_wallet_address", traderWalletAddress)
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
      .eq("trader_wallet_address", traderWalletAddress)
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
      .eq("trader_wallet_address", traderWalletAddress)
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
      .eq("trader_wallet_address", traderWalletAddress);

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
      .eq("trader_wallet_address", traderWalletAddress)
      .in("status", ["PENDING", "PARTIALLY_FILLED"]);

    if (error) {
      throw error;
    }

    return orders ?? [];
  }
}

export const traderDashboardRepository = new TraderDashboardRepository();
