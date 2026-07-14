import { getAddress, isAddress } from "ethers";
import { traderDashboardRepository } from "@/repositories/trader-dashboard-repository";
import { verifyMasterOnChain } from "@/lib/web3/master-registry/server";
import { getOnChainTradeMetrics } from "@/lib/web3/trade-history/server";

export const MASTER_REQUIREMENTS = {
  minClosedTrades: 10,
  minRoi: 10,
  minTradingVolume: 10_000,
} as const;

export type MasterEligibility = {
  traderWalletAddress: string;
  eligible: boolean;
  totalTrades: number;
  roi: number;
  tradingVolume: number;
  requirements: {
    totalTrades: RequirementStatus;
    roi: RequirementStatus;
    tradingVolume: RequirementStatus;
  };
  portfolio: {
    masterStatus: string;
    isVerifiedMaster: boolean;
    masterVerifiedAt: string | null;
    masterVerificationTxHash: string | null;
    masterVerificationBlock: number | null;
    masterVerificationError: string | null;
  };
};

type RequirementStatus = {
  required: number;
  actual: number;
  passed: boolean;
};

function assertWalletAddress(traderWalletAddress: string) {
  if (!isAddress(traderWalletAddress)) {
    throw new Error("Invalid trader wallet address");
  }

  return getAddress(traderWalletAddress);
}

export async function getMasterEligibility(traderWalletAddress: string): Promise<MasterEligibility> {
  const wallet = assertWalletAddress(traderWalletAddress);
  const [portfolio, onChainMetrics] = await Promise.all([
    traderDashboardRepository.ensurePortfolio(wallet),
    getOnChainTradeMetrics(wallet),
  ]);

  const totalTrades = onChainMetrics.totalTrades;
  const tradingVolume = onChainMetrics.tradingVolume;
  const roi = onChainMetrics.roi;

  const requirements = {
    totalTrades: {
      required: MASTER_REQUIREMENTS.minClosedTrades,
      actual: totalTrades,
      passed: totalTrades >= MASTER_REQUIREMENTS.minClosedTrades,
    },
    roi: {
      required: MASTER_REQUIREMENTS.minRoi,
      actual: roi,
      passed: roi >= MASTER_REQUIREMENTS.minRoi,
    },
    tradingVolume: {
      required: MASTER_REQUIREMENTS.minTradingVolume,
      actual: tradingVolume,
      passed: tradingVolume >= MASTER_REQUIREMENTS.minTradingVolume,
    },
  };

  return {
    traderWalletAddress: wallet,
    eligible: requirements.totalTrades.passed && requirements.roi.passed && requirements.tradingVolume.passed,
    totalTrades,
    roi,
    tradingVolume,
    requirements,
    portfolio: {
      masterStatus: portfolio.master_status ?? "NONE",
      isVerifiedMaster: Boolean(portfolio.is_verified_master),
      masterVerifiedAt: portfolio.master_verified_at ?? null,
      masterVerificationTxHash: portfolio.master_verification_tx_hash ?? null,
      masterVerificationBlock: portfolio.master_verification_block ? Number(portfolio.master_verification_block) : null,
      masterVerificationError: portfolio.master_verification_error ?? null,
    },
  };
}

export async function verifyMasterTrader(traderWalletAddress: string) {
  const wallet = assertWalletAddress(traderWalletAddress);
  const eligibility = await getMasterEligibility(wallet);

  if (eligibility.portfolio.isVerifiedMaster) {
    throw new Error("Trader is already a verified master");
  }

  if (!eligibility.eligible) {
    throw new Error("Trader does not meet master trader eligibility requirements");
  }

  const pendingPortfolio = await traderDashboardRepository.markMasterVerificationPending(wallet);

  if (!pendingPortfolio) {
    throw new Error("Master verification is already pending or completed");
  }

  try {
    const result = await verifyMasterOnChain({
      trader: wallet,
      totalTrades: eligibility.totalTrades,
      roi: eligibility.roi,
      tradingVolume: eligibility.tradingVolume,
    });

    const portfolio = await traderDashboardRepository.saveMasterVerificationSuccess({
      traderWalletAddress: wallet,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      totalTrades: eligibility.totalTrades,
      roi: eligibility.roi,
      tradingVolume: eligibility.tradingVolume,
    });

    return {
      traderWalletAddress: wallet,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      eligibility,
      portfolio,
    };
  } catch (error) {
    await traderDashboardRepository.saveMasterVerificationFailure({
      traderWalletAddress: wallet,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
