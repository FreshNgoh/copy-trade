import { isAddress, type Address } from "viem";

const configuredAddress = process.env.NEXT_PUBLIC_MASTER_REGISTRY_CONTRACT_ADDRESS?.trim();
const configuredDeploymentBlock = Number(
  process.env.NEXT_PUBLIC_MASTER_REGISTRY_DEPLOYMENT_BLOCK,
);

export const MASTER_REGISTRY_CONTRACT_ADDRESS =
  configuredAddress && isAddress(configuredAddress)
    ? (configuredAddress as Address)
    : undefined;

export const MASTER_REGISTRY_DEPLOYMENT_BLOCK = Number.isFinite(
  configuredDeploymentBlock,
)
  ? BigInt(configuredDeploymentBlock)
  : 11410856n;
