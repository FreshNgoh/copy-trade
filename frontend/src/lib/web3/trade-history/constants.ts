import { isAddress, type Address } from "viem";

const configuredAddress = process.env.NEXT_PUBLIC_TRADE_HISTORY_CONTRACT_ADDRESS?.trim();

export const TRADE_HISTORY_CONTRACT_ADDRESS =
  configuredAddress && isAddress(configuredAddress)
    ? (configuredAddress as Address)
    : undefined;
