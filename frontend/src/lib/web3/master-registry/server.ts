import { Contract, Interface, JsonRpcProvider, Wallet, formatUnits, getAddress, parseUnits } from "ethers";
import { masterTraderRegistryAbi } from "./abi";

export type VerifyMasterInput = {
  trader: string;
  totalTrades: number;
  roi: number;
  tradingVolume: number;
};

export type VerifyMasterResult = {
  txHash: string;
  blockNumber: number | null;
};

export type MasterVerificationSnapshot = {
  verified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
  totalTrades: number;
  roi: number;
  tradingVolume: number;
};

const masterRegistryInterface = new Interface(masterTraderRegistryAbi);
const zeroAddress = "0x0000000000000000000000000000000000000000";

export function scaleMasterRoi(roi: number) {
  return parseUnits(roi.toFixed(4), 4);
}

export function scaleTradingVolume(tradingVolume: number) {
  return parseUnits(tradingVolume.toFixed(6), 6);
}

export async function getMasterVerificationOnChain(
  traderWalletAddress: string,
): Promise<MasterVerificationSnapshot | null> {
  const rpcUrl = process.env.RPC_URL;
  const contractAddress =
    process.env.MASTER_REGISTRY_CONTRACT_ADDRESS ??
    process.env.NEXT_PUBLIC_MASTER_REGISTRY_CONTRACT_ADDRESS;
  const chainId = Number(process.env.CHAIN_ID || "11155111");

  if (!rpcUrl || !contractAddress) return null;
  if (!Number.isFinite(chainId)) throw new Error("Invalid CHAIN_ID");

  const provider = new JsonRpcProvider(rpcUrl, chainId);
  const contract = new Contract(getAddress(contractAddress), masterTraderRegistryAbi, provider);
  const verification = await contract.getMasterVerification(getAddress(traderWalletAddress));

  return {
    verified: Boolean(verification.verified),
    verifiedAt:
      verification.verifiedAt > 0n
        ? new Date(Number(verification.verifiedAt) * 1000).toISOString()
        : null,
    verifiedBy:
      verification.verifiedBy && verification.verifiedBy !== zeroAddress
        ? getAddress(verification.verifiedBy)
        : null,
    totalTrades: Number(verification.totalTrades),
    roi: Number(formatUnits(verification.roi, 4)),
    tradingVolume: Number(formatUnits(verification.tradingVolume, 6)),
  };
}

export async function verifyMasterOnChain(input: VerifyMasterInput): Promise<VerifyMasterResult> {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.MASTER_VERIFIER_PRIVATE_KEY;
  const contractAddress = process.env.MASTER_REGISTRY_CONTRACT_ADDRESS;
  const chainId = Number(process.env.CHAIN_ID || "11155111");

  if (!rpcUrl) throw new Error("Missing RPC_URL");
  if (!privateKey) throw new Error("Missing MASTER_VERIFIER_PRIVATE_KEY");
  if (!contractAddress) throw new Error("Missing MASTER_REGISTRY_CONTRACT_ADDRESS");
  if (!Number.isFinite(chainId)) throw new Error("Invalid CHAIN_ID");

  const provider = new JsonRpcProvider(rpcUrl, chainId);
  const signer = new Wallet(privateKey, provider);
  const contract = new Contract(getAddress(contractAddress), masterTraderRegistryAbi, signer);

  const tx = await contract.verifyMaster(
    getAddress(input.trader),
    BigInt(input.totalTrades),
    scaleMasterRoi(input.roi),
    scaleTradingVolume(input.tradingVolume),
  );
  const receipt = await tx.wait(1);

  if (!receipt) {
    throw new Error(`MasterTraderRegistry transaction was not confirmed: ${tx.hash}`);
  }

  assertVerificationEvent(receipt.logs);

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber ?? null,
  };
}

function assertVerificationEvent(logs: readonly { topics: readonly string[]; data: string }[]) {
  for (const log of logs) {
    try {
      const parsed = masterRegistryInterface.parseLog(log);

      if (parsed?.name === "MasterTraderVerified") {
        return;
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  throw new Error("MasterTraderVerified event not found in transaction receipt");
}
