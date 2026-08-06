import { getAddress, verifyTypedData } from "ethers";
import type { TypedDataField } from "ethers";
import type { Address } from "viem";
import {
  buildCopySettingsIntentMessage,
  buildPauseCopyIntentMessage,
  buildVerifyMasterIntentMessage,
  copySettingsIntentTypes,
  getIntentDomain,
  pauseCopyIntentTypes,
  verifyMasterIntentTypes,
} from "./eip712-intents";

type SignedIntent = {
  signature: string;
  deadline: bigint;
};

export function requireValidCopySettingsIntent(input: {
  follower: string;
  trader: string;
  maxCopyAmount: number;
  maxAllocationBps: number;
  stopLossBps: number;
  maxDailyTrades: number;
  signature: string;
  deadline: bigint;
}) {
  const follower = getAddress(input.follower) as Address;
  const trader = getAddress(input.trader) as Address;

  assertDeadline(input.deadline);
  assertSigner({
    expectedSigner: follower,
    signed: input,
    verifyingContract: getRequiredAddressEnv(
      "COPY_TRADING_CONTRACT_ADDRESS",
      "NEXT_PUBLIC_COPY_TRADING_ADDRESS",
    ),
    types: copySettingsIntentTypes,
    primaryType: "CopySettingsIntent",
    message: buildCopySettingsIntentMessage({
      follower,
      trader,
      maxCopyAmount: input.maxCopyAmount,
      maxAllocationBps: input.maxAllocationBps,
      stopLossBps: input.stopLossBps,
      maxDailyTrades: input.maxDailyTrades,
      deadline: input.deadline,
    }),
  });
}

export function requireValidPauseCopyIntent(input: {
  follower: string;
  trader: string;
  signature: string;
  deadline: bigint;
}) {
  const follower = getAddress(input.follower) as Address;
  const trader = getAddress(input.trader) as Address;

  assertDeadline(input.deadline);
  assertSigner({
    expectedSigner: follower,
    signed: input,
    verifyingContract: getRequiredAddressEnv(
      "COPY_TRADING_CONTRACT_ADDRESS",
      "NEXT_PUBLIC_COPY_TRADING_ADDRESS",
    ),
    types: pauseCopyIntentTypes,
    primaryType: "PauseCopyIntent",
    message: buildPauseCopyIntentMessage({
      follower,
      trader,
      deadline: input.deadline,
    }),
  });
}

export function requireValidVerifyMasterIntent(input: {
  trader: string;
  signature: string;
  deadline: bigint;
}) {
  const trader = getAddress(input.trader) as Address;

  assertDeadline(input.deadline);
  assertSigner({
    expectedSigner: trader,
    signed: input,
    verifyingContract: getRequiredAddressEnv(
      "MASTER_REGISTRY_CONTRACT_ADDRESS",
      "NEXT_PUBLIC_MASTER_REGISTRY_CONTRACT_ADDRESS",
    ),
    types: verifyMasterIntentTypes,
    primaryType: "VerifyMasterIntent",
    message: buildVerifyMasterIntentMessage({
      trader,
      deadline: input.deadline,
    }),
  });
}

function assertDeadline(deadline: bigint) {
  const now = BigInt(Math.floor(Date.now() / 1000));

  if (deadline < now) {
    throw new Error("Signed request expired. Please sign again.");
  }
}

function assertSigner({
  expectedSigner,
  signed,
  verifyingContract,
  types,
  primaryType,
  message,
}: {
  expectedSigner: Address;
  signed: SignedIntent;
  verifyingContract: Address;
  types: Record<string, readonly { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
}) {
  const recovered = verifyTypedData(
    getIntentDomain({
      chainId: getChainId(),
      verifyingContract,
    }),
    types as Record<string, TypedDataField[]>,
    message,
    signed.signature,
  );

  if (getAddress(recovered) !== getAddress(expectedSigner)) {
    throw new Error("Signed request does not match the wallet address.");
  }
}

function getChainId() {
  const chainId = Number(process.env.CHAIN_ID || "11155111");

  if (!Number.isFinite(chainId)) {
    throw new Error("Invalid CHAIN_ID");
  }

  return chainId;
}

function getRequiredAddressEnv(name: string, fallbackName: string) {
  const value =
    process.env[name]?.trim() || process.env[fallbackName]?.trim() || "";

  if (!value) {
    throw new Error(`Missing ${name} or ${fallbackName}`);
  }

  return getAddress(value) as Address;
}
