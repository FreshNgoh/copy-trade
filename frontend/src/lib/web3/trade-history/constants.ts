import { isAddress, type Address } from "viem";

const configuredAddress = process.env.NEXT_PUBLIC_TRADE_HISTORY_CONTRACT_ADDRESS?.trim();
const configuredDeploymentBlock = Number(
  process.env.NEXT_PUBLIC_TRADE_HISTORY_DEPLOYMENT_BLOCK,
);

export const TRADE_HISTORY_CONTRACT_ADDRESS =
  configuredAddress && isAddress(configuredAddress)
    ? (configuredAddress as Address)
    : undefined;

export const TRADE_HISTORY_DEPLOYMENT_BLOCK = Number.isFinite(
  configuredDeploymentBlock,
)
  ? BigInt(configuredDeploymentBlock)
  : 11306343n;
