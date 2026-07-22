import { getAddress } from "ethers";
import { traderDashboardRepository } from "@/repositories/trader-dashboard-repository";
import type { VerifiedMasterTrader } from "@/types/verified-master";
import { getOnChainTradeMetrics } from "@/lib/web3/trade-history/server";

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function getVerifiedMasterTraders(): Promise<VerifiedMasterTrader[]> {
  const portfolios = await traderDashboardRepository.getVerifiedMasterTraders();

  return Promise.all(
    portfolios.map(async (portfolio) => {
      const address = getAddress(portfolio.trader_wallet_address);
      let totalTrades = toNumber(portfolio.master_total_trades);
      let roi = toNumber(portfolio.master_roi);
      let tradingVolume = toNumber(portfolio.master_trading_volume);

      try {
        const currentMetrics = await getOnChainTradeMetrics(address);
        totalTrades = currentMetrics.totalTrades;
        roi = currentMetrics.roi;
        tradingVolume = currentMetrics.tradingVolume;
      } catch (error) {
        console.error("Failed to refresh verified master metrics:", {
          traderWalletAddress: address,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return {
        traderId: portfolio.trader_id,
        traderWalletAddress: address as `0x${string}`,
        displayName: shortAddress(address),
        followers: toNumber(portfolio.followers),
        walletBalance: toNumber(portfolio.wallet_balance),
        totalTrades,
        roi,
        tradingVolume,
        verifiedAt: portfolio.master_verified_at ?? null,
        verificationTxHash: portfolio.master_verification_tx_hash ?? null,
      };
    }),
  );
}
