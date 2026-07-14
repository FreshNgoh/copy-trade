import { getAddress } from "ethers";
import { traderDashboardRepository } from "@/repositories/trader-dashboard-repository";
import type { VerifiedMasterTrader } from "@/types/verified-master";

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function getVerifiedMasterTraders(): Promise<VerifiedMasterTrader[]> {
  const portfolios = await traderDashboardRepository.getVerifiedMasterTraders();

  return portfolios.map((portfolio) => {
    const address = getAddress(portfolio.trader_wallet_address);

    return {
      traderId: portfolio.trader_id,
      traderWalletAddress: address as `0x${string}`,
      displayName: shortAddress(address),
      followers: toNumber(portfolio.followers),
      walletBalance: toNumber(portfolio.wallet_balance),
      totalTrades: toNumber(portfolio.master_total_trades),
      roi: toNumber(portfolio.master_roi),
      tradingVolume: toNumber(portfolio.master_trading_volume),
      verifiedAt: portfolio.master_verified_at ?? null,
      verificationTxHash: portfolio.master_verification_tx_hash ?? null,
    };
  });
}
