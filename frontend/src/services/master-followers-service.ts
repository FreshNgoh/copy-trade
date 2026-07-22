import { copyTradingRepository } from "@/repositories/copy-trading-repository";
import { positionRepository } from "@/repositories/position-repository";
import type { MasterFollowersSummary } from "@/types/master-follower";
import { traderDashboardRepository } from "@/repositories/trader-dashboard-repository";

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}


export async function getMasterFollowers(
  masterWalletAddress: string,
): Promise<MasterFollowersSummary> {
  const [portfolio, settings, copiedPositions] = await Promise.all([
    traderDashboardRepository.getPortfolio(masterWalletAddress),
    copyTradingRepository.getFollowersForMaster(masterWalletAddress),
    positionRepository.getCopiedPositionsForMaster(masterWalletAddress),
  ]);

  if (!portfolio?.is_verified_master) {
    throw new Error("Follower analytics are available to verified masters only");
  }

  const now = Date.now();
  const followers = settings.map((setting) => {
    const followedAt = new Date(setting.created_at);
    const wallet = String(setting.follower_wallet_address);
    const positions = copiedPositions.filter(
      (position) =>
        position.trader_wallet_address.toLowerCase() === wallet.toLowerCase() &&
        new Date(position.created_at).getTime() >= followedAt.getTime(),
    );
    const closedPositions = positions.filter(
      (position) => position.status === "CLOSED",
    );

    return {
      id: String(setting.id),
      followerWalletAddress: wallet,
      enabled: Boolean(setting.enabled),
      followedAt: followedAt.toISOString(),
      followedDays: Math.max(
        Math.floor((now - followedAt.getTime()) / (24 * 60 * 60 * 1000)),
        0,
      ),
      maxCopyAmount: toNumber(setting.max_copy_amount),
      realizedEarnings: closedPositions.reduce(
        (total, position) =>
          total + toNumber(position.follower_reward ?? position.Pnl),
        0,
      ),
      masterProfitShare: closedPositions.reduce(
        (total, position) => total + toNumber(position.master_reward),
        0,
      ),
      copiedTrades: closedPositions.length,
      activeCopiedPositions: positions.filter(
        (position) => position.status === "OPEN",
      ).length,
      lastCopiedAt: setting.last_copied_at ?? null,
    };
  });

  return {
    followers,
    totalFollowers: followers.length,
    activeFollowers: followers.filter((follower) => follower.enabled).length,
    totalAllocated: followers
      .filter((follower) => follower.enabled)
      .reduce((total, follower) => total + follower.maxCopyAmount, 0),
    totalFollowerEarnings: followers.reduce(
      (total, follower) => total + follower.realizedEarnings,
      0,
    ),
    totalMasterProfitShare: followers.reduce(
      (total, follower) => total + follower.masterProfitShare,
      0,
    ),
  };
}
