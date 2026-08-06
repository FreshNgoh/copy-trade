import { parseUnits, type Address } from "viem";

export const INTENT_DOMAIN_NAME = "Alphavault";
export const INTENT_DOMAIN_VERSION = "1";
export const INTENT_TTL_SECONDS = 5 * 60;

export const copySettingsIntentTypes = {
  CopySettingsIntent: [
    { name: "follower", type: "address" },
    { name: "trader", type: "address" },
    { name: "maxCopyAmount", type: "uint256" },
    { name: "maxAllocationBps", type: "uint16" },
    { name: "stopLossBps", type: "uint16" },
    { name: "maxDailyTrades", type: "uint16" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export const pauseCopyIntentTypes = {
  PauseCopyIntent: [
    { name: "follower", type: "address" },
    { name: "trader", type: "address" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export const verifyMasterIntentTypes = {
  VerifyMasterIntent: [
    { name: "trader", type: "address" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export function getIntentDomain({
  chainId,
  verifyingContract,
}: {
  chainId: number;
  verifyingContract: Address;
}) {
  return {
    name: INTENT_DOMAIN_NAME,
    version: INTENT_DOMAIN_VERSION,
    chainId,
    verifyingContract,
  } as const;
}

export function createIntentDeadline() {
  return BigInt(Math.floor(Date.now() / 1000) + INTENT_TTL_SECONDS);
}

export function getClientIntentChainId() {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111");

  if (!Number.isFinite(chainId)) {
    throw new Error("Invalid NEXT_PUBLIC_CHAIN_ID");
  }

  return chainId;
}

export function buildCopySettingsIntentMessage({
  follower,
  trader,
  maxCopyAmount,
  maxAllocationBps,
  stopLossBps,
  maxDailyTrades,
  deadline,
}: {
  follower: Address;
  trader: Address;
  maxCopyAmount: number;
  maxAllocationBps: number;
  stopLossBps: number;
  maxDailyTrades: number;
  deadline: bigint;
}) {
  return {
    follower,
    trader,
    maxCopyAmount: scaleUsdcIntentValue(maxCopyAmount),
    maxAllocationBps,
    stopLossBps,
    maxDailyTrades,
    deadline,
  } as const;
}

export function buildPauseCopyIntentMessage({
  follower,
  trader,
  deadline,
}: {
  follower: Address;
  trader: Address;
  deadline: bigint;
}) {
  return {
    follower,
    trader,
    deadline,
  } as const;
}

export function buildVerifyMasterIntentMessage({
  trader,
  deadline,
}: {
  trader: Address;
  deadline: bigint;
}) {
  return {
    trader,
    deadline,
  } as const;
}

export function scaleUsdcIntentValue(value: number) {
  return parseUnits(normalizeDecimal(value, 6), 6);
}

function normalizeDecimal(value: number, decimals: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid intent numeric value: ${value}`);
  }

  return value.toFixed(decimals);
}
