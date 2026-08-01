import { supabase } from "@/lib/supabase/server";
import { positionRepository } from "@/repositories/position-repository";
import { traderDashboardRepository } from "@/repositories/trader-dashboard-repository";

export type SaveCopySettingsInput = {
  masterWalletAddress: string;
  followerWalletAddress: string;
  maxCopyAmount: number;
  maxAllocationBps: number;
  stopLossBps: number;
  maxDailyTrades: number;
  settingsTxHash: string;
};

export class CopyTradingRepository {
  async getFollowersForMaster(masterWalletAddress: string) {
    const { data, error } = await supabase
      .from("copy_trading_followers")
      .select(
        "id,follower_wallet_address,max_copy_amount,enabled,created_at,updated_at,last_copied_at",
      )
      .ilike("master_wallet_address", masterWalletAddress)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async getActiveCopyAllocation({
    followerWalletAddress,
    excludeMasterWalletAddress,
  }: {
    followerWalletAddress: string;
    excludeMasterWalletAddress?: string;
  }) {
    const { data, error } = await supabase
      .from("copy_trading_followers")
      .select("master_wallet_address,max_copy_amount")
      .ilike("follower_wallet_address", followerWalletAddress)
      .eq("enabled", true);

    if (error) throw error;

    const excludedMaster = excludeMasterWalletAddress?.toLowerCase();
    return (data ?? []).reduce((total, setting) => {
      if (setting.master_wallet_address?.toLowerCase() === excludedMaster) {
        return total;
      }

      return total + Number(setting.max_copy_amount || 0);
    }, 0);
  }

  async saveCopySettings(input: SaveCopySettingsInput) {
    await Promise.all([
      traderDashboardRepository.ensurePortfolio(input.masterWalletAddress),
      traderDashboardRepository.ensurePortfolio(input.followerWalletAddress),
    ]);

    const existingSettings = await this.getCopySettings({
      masterWalletAddress: input.masterWalletAddress,
      followerWalletAddress: input.followerWalletAddress,
    });
    const existingAllocation = existingSettings?.enabled
      ? Number(existingSettings.max_copy_amount || 0)
      : 0;
    const allocationDelta = input.maxCopyAmount - existingAllocation;

    if (allocationDelta < 0) {
      const activeCopiedMargin = await positionRepository.getOpenCopiedMargin({
        followerWalletAddress: input.followerWalletAddress,
        masterWalletAddress: input.masterWalletAddress,
      });

      if (input.maxCopyAmount < activeCopiedMargin) {
        throw new Error(
          `Cannot reduce copy wallet below active copied margin (${activeCopiedMargin.toFixed(
            2,
          )} USDC).`,
        );
      }
    }

    const [portfolio, otherActiveAllocation] = await Promise.all([
      traderDashboardRepository.ensurePortfolio(input.followerWalletAddress),
      this.getActiveCopyAllocation({
        followerWalletAddress: input.followerWalletAddress,
        excludeMasterWalletAddress: input.masterWalletAddress,
      }),
    ]);
    const requiredCopyBalance = otherActiveAllocation + input.maxCopyAmount;
    if (requiredCopyBalance > Number(portfolio.copy_wallet_balance || 0)) {
      throw new Error(
        `Active copy allocations require ${requiredCopyBalance.toFixed(2)} USDC. Transfer more funds to Copy Wallet or pause another master first.`,
      );
    }

    const { data, error } = await supabase
      .from("copy_trading_followers")
      .upsert(
        {
          master_wallet_address: input.masterWalletAddress,
          follower_wallet_address: input.followerWalletAddress,
          max_copy_amount: input.maxCopyAmount,
          max_allocation_bps: input.maxAllocationBps,
          stop_loss_bps: input.stopLossBps,
          max_daily_trades: input.maxDailyTrades,
          enabled: true,
          settings_tx_hash: input.settingsTxHash,
          paused_tx_hash: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "master_wallet_address,follower_wallet_address",
        },
      )
      .select()
      .single();

    if (error) throw error;

    await this.syncMasterFollowerCount(input.masterWalletAddress);

    return data;
  }

  async getCopySettings({
    masterWalletAddress,
    followerWalletAddress,
  }: {
    masterWalletAddress: string;
    followerWalletAddress: string;
  }) {
    const { data, error } = await supabase
      .from("copy_trading_followers")
      .select("*")
      .ilike("master_wallet_address", masterWalletAddress)
      .ilike("follower_wallet_address", followerWalletAddress)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async pauseCopy({
    masterWalletAddress,
    followerWalletAddress,
    pausedTxHash,
  }: {
    masterWalletAddress: string;
    followerWalletAddress: string;
    pausedTxHash: string;
  }) {
    const existingSettings = await this.getCopySettings({
      masterWalletAddress,
      followerWalletAddress,
    });

    const { data, error } = await supabase
      .from("copy_trading_followers")
      .update({
        enabled: false,
        paused_tx_hash: pausedTxHash,
        updated_at: new Date().toISOString(),
      })
      .ilike("master_wallet_address", masterWalletAddress)
      .ilike("follower_wallet_address", followerWalletAddress)
      .select()
      .maybeSingle();

    if (error) throw error;

    await this.syncMasterFollowerCount(masterWalletAddress);

    return data;
  }

  async getEnabledFollowers(masterWalletAddress: string) {
    const { data, error } = await supabase
      .from("copy_trading_followers")
      .select("follower_wallet_address,max_copy_amount,max_allocation_bps")
      .ilike("master_wallet_address", masterWalletAddress)
      .eq("enabled", true);

    if (error) throw error;

    return (data ?? []).map((row) => ({
      follower: row.follower_wallet_address as string,
      maxCopyAmount: Number(row.max_copy_amount || 0),
      maxAllocationBps: Number(row.max_allocation_bps || 0),
    }));
  }

  async disableAllForFollower(followerWalletAddress: string) {
    const { data, error } = await supabase
      .from("copy_trading_followers")
      .update({
        enabled: false,
        last_copy_status: "FAILED",
        last_copy_error: "Copy Wallet liquidated",
        updated_at: new Date().toISOString(),
      })
      .ilike("follower_wallet_address", followerWalletAddress)
      .eq("enabled", true)
      .select("master_wallet_address");

    if (error) throw error;

    await Promise.all(
      Array.from(
        new Set((data ?? []).map((row) => row.master_wallet_address as string)),
      ).map((masterWalletAddress) =>
        this.syncMasterFollowerCount(masterWalletAddress),
      ),
    );

    return data ?? [];
  }

  async saveCopySuccess({
    masterWalletAddress,
    followerWalletAddress,
    txHash,
    copyPositionId,
  }: {
    masterWalletAddress: string;
    followerWalletAddress: string;
    txHash: string;
    copyPositionId: string;
  }) {
    const { error } = await supabase
      .from("copy_trading_followers")
      .update({
        last_copy_status: "SUCCESS",
        last_copy_error: null,
        last_copy_tx_hash: txHash,
        last_copy_position_id: copyPositionId,
        last_copied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .ilike("master_wallet_address", masterWalletAddress)
      .ilike("follower_wallet_address", followerWalletAddress);

    if (error) throw error;
  }

  async saveCopyFailure({
    masterWalletAddress,
    followerWalletAddress,
    errorMessage,
  }: {
    masterWalletAddress: string;
    followerWalletAddress: string;
    errorMessage: string;
  }) {
    const { error } = await supabase
      .from("copy_trading_followers")
      .update({
        last_copy_status: "FAILED",
        last_copy_error: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .ilike("master_wallet_address", masterWalletAddress)
      .ilike("follower_wallet_address", followerWalletAddress);

    if (error) throw error;
  }

  async syncMasterFollowerCount(masterWalletAddress: string) {
    const { count, error } = await supabase
      .from("copy_trading_followers")
      .select("id", { count: "exact", head: true })
      .ilike("master_wallet_address", masterWalletAddress)
      .eq("enabled", true);

    if (error) throw error;

    return traderDashboardRepository.updateFollowerCount({
      traderWalletAddress: masterWalletAddress,
      followers: count ?? 0,
    });
  }
}

export const copyTradingRepository = new CopyTradingRepository();
