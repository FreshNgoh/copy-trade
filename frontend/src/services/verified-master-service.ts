import { Contract, JsonRpcProvider, getAddress } from "ethers";
import { getOnChainTradeMetrics } from "@/lib/web3/trade-history/server";
import { positionRepository } from "@/repositories/position-repository";
import { traderDashboardRepository } from "@/repositories/trader-dashboard-repository";
import type { VerifiedMasterTrader } from "@/types/verified-master";
import { masterTraderRegistryAbi } from "@/lib/web3/master-registry/abi";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getRequiredEnv(name: string, fallbackName?: string) {
  const value =
    process.env[name]?.trim() ||
    (fallbackName ? process.env[fallbackName]?.trim() : "");

  if (!value) {
    throw new Error(`Missing ${name}${fallbackName ? ` or ${fallbackName}` : ""}`);
  }

  return value;
}

export async function getVerifiedMasterTraders(): Promise<VerifiedMasterTrader[]> {
  const rpcUrl = getRequiredEnv("RPC_URL", "NEXT_PUBLIC_SEPOLIA_RPC");
  const contractAddress = getRequiredEnv(
    "MASTER_REGISTRY_CONTRACT_ADDRESS",
    "NEXT_PUBLIC_MASTER_REGISTRY_CONTRACT_ADDRESS",
  );
  const chainId = Number(process.env.CHAIN_ID || "11155111");

  if (!Number.isFinite(chainId)) throw new Error("Invalid CHAIN_ID");

  const portfolios = await traderDashboardRepository.getVerifiedMasterTraders();
  const provider = new JsonRpcProvider(rpcUrl, {
    chainId,
    name: chainId === 11155111 ? "sepolia" : "unknown",
  });
  const registry = new Contract(
    getAddress(contractAddress),
    masterTraderRegistryAbi,
    provider,
  );
  const traders = await Promise.all(
    portfolios.map(async (portfolio) => {
      const address = getAddress(portfolio.trader_wallet_address);
      const verification = await registry.getMasterVerification(address);

      if (!verification.verified) return null;

      const sourceOverrides = await positionRepository.getClosedPositions(address);
      const masterTradeMetrics = await getOnChainTradeMetrics(address, {
        source: "master-copy",
        verifiedAt: verification.verifiedAt,
        sourceOverrides,
      });

      return {
        traderId: address,
        traderWalletAddress: address as `0x${string}`,
        displayName: shortAddress(address),
        followers: Number(portfolio.followers || 0),
        walletBalance: Number(portfolio.wallet_balance || 0),
        totalTrades: masterTradeMetrics.totalTrades,
        roi: masterTradeMetrics.roi,
        winRate: masterTradeMetrics.winRate,
        roiHistory: masterTradeMetrics.roiHistory,
        tradingVolume: masterTradeMetrics.tradingVolume,
        verifiedAt:
          verification.verifiedAt > 0n
            ? new Date(Number(verification.verifiedAt) * 1000).toISOString()
            : null,
        verificationTxHash: portfolio.master_verification_tx_hash ?? null,
        verificationBlock: portfolio.master_verification_block
          ? Number(portfolio.master_verification_block)
          : null,
      } satisfies VerifiedMasterTrader;
    }),
  );

  return traders
    .filter((trader): trader is VerifiedMasterTrader => trader !== null)
    .sort((a, b) => b.tradingVolume - a.tradingVolume);
}
