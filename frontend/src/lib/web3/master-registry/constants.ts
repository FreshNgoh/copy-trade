import { isAddress, type Address } from "viem";

const configuredAddress = process.env.NEXT_PUBLIC_MASTER_REGISTRY_CONTRACT_ADDRESS?.trim();

export const MASTER_REGISTRY_CONTRACT_ADDRESS =
  configuredAddress && isAddress(configuredAddress)
    ? (configuredAddress as Address)
    : undefined;
