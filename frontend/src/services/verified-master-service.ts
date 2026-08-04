import {
  Contract,
  Interface,
  JsonRpcProvider,
  formatUnits,
  getAddress,
} from "ethers";
import type { VerifiedMasterTrader } from "@/types/verified-master";
import { getOnChainTradeMetrics } from "@/lib/web3/trade-history/server";
import { masterTraderRegistryAbi } from "@/lib/web3/master-registry/abi";

const MASTER_ROI_DECIMALS = 4;
const MASTER_VOLUME_DECIMALS = 6;
const LOG_BLOCK_RANGE = 10;
const FALLBACK_MASTER_REGISTRY_DEPLOYMENT_BLOCK = 11410856;

type VerificationEvent = {
  trader: string;
  txHash: string;
  blockNumber: number;
};

const registryInterface = new Interface(masterTraderRegistryAbi);
const masterVerifiedTopic = registryInterface.getEvent(
  "MasterTraderVerified",
)?.topicHash;

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getRequiredEnv(name: string, fallbackName?: string) {
  const value = process.env[name]?.trim() || (fallbackName ? process.env[fallbackName]?.trim() : "");

  if (!value) {
    throw new Error(`Missing ${name}${fallbackName ? ` or ${fallbackName}` : ""}`);
  }

  return value;
}

function getMasterRegistryDeploymentBlock() {
  const configured = Number(
    process.env.MASTER_REGISTRY_DEPLOYMENT_BLOCK ??
      process.env.NEXT_PUBLIC_MASTER_REGISTRY_DEPLOYMENT_BLOCK,
  );

  return Number.isFinite(configured)
    ? configured
    : FALLBACK_MASTER_REGISTRY_DEPLOYMENT_BLOCK;
}

export async function getVerifiedMasterTraders(): Promise<VerifiedMasterTrader[]> {
  const rpcUrl = getRequiredEnv("RPC_URL", "NEXT_PUBLIC_SEPOLIA_RPC");
  const contractAddress = getRequiredEnv(
    "MASTER_REGISTRY_CONTRACT_ADDRESS",
    "NEXT_PUBLIC_MASTER_REGISTRY_CONTRACT_ADDRESS",
  );
  const chainId = Number(process.env.CHAIN_ID || "11155111");

  if (!Number.isFinite(chainId)) throw new Error("Invalid CHAIN_ID");
  if (!masterVerifiedTopic) throw new Error("Missing MasterTraderVerified topic");

  const provider = new JsonRpcProvider(rpcUrl, chainId);
  const registry = new Contract(
    getAddress(contractAddress),
    masterTraderRegistryAbi,
    provider,
  );
  const verifiedEvents = await readMasterVerificationEvents({
    provider,
    contractAddress: getAddress(contractAddress),
  });

  const traders = await Promise.all(
    verifiedEvents.map(async (event) => {
      const verification = await registry.getMasterVerification(event.trader);
      let totalTrades = toNumber(verification.totalTrades);
      let roi = Number(formatUnits(verification.roi, MASTER_ROI_DECIMALS));
      let tradingVolume = Number(
        formatUnits(verification.tradingVolume, MASTER_VOLUME_DECIMALS),
      );

      try {
        const currentMetrics = await getOnChainTradeMetrics(event.trader);
        totalTrades = currentMetrics.totalTrades;
        roi = currentMetrics.roi;
        tradingVolume = currentMetrics.tradingVolume;
      } catch (error) {
        console.error("Failed to refresh verified master metrics:", {
          traderWalletAddress: event.trader,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return {
        traderId: event.trader,
        traderWalletAddress: getAddress(event.trader) as `0x${string}`,
        displayName: shortAddress(event.trader),
        followers: 0,
        walletBalance: 0,
        totalTrades,
        roi,
        tradingVolume,
        verifiedAt:
          verification.verifiedAt > 0n
            ? new Date(Number(verification.verifiedAt) * 1000).toISOString()
            : null,
        verificationTxHash: event.txHash,
        verificationBlock: event.blockNumber,
      } satisfies VerifiedMasterTrader;
    }),
  );

  return traders.sort((a, b) => b.tradingVolume - a.tradingVolume);
}

async function readMasterVerificationEvents({
  provider,
  contractAddress,
}: {
  provider: JsonRpcProvider;
  contractAddress: string;
}) {
  const latestBlock = await provider.getBlockNumber();
  const startBlock = Math.min(getMasterRegistryDeploymentBlock(), latestBlock);
  const events = new Map<string, VerificationEvent>();

  for (
    let fromBlock = startBlock;
    fromBlock <= latestBlock;
    fromBlock += LOG_BLOCK_RANGE
  ) {
    const toBlock = Math.min(fromBlock + LOG_BLOCK_RANGE - 1, latestBlock);
    const logs = await provider.getLogs({
      address: contractAddress,
      topics: [masterVerifiedTopic],
      fromBlock,
      toBlock,
    });

    for (const log of logs) {
      const parsed = registryInterface.parseLog(log);

      if (parsed?.name !== "MasterTraderVerified") continue;

      const trader = getAddress(parsed.args.trader);
      events.set(trader.toLowerCase(), {
        trader,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
      });
    }
  }

  return Array.from(events.values());
}
