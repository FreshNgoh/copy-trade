import { isAddress, type Address } from "viem";

const usdc = process.env.NEXT_PUBLIC_USDC_ADDRESS?.trim();
const vault = process.env.NEXT_PUBLIC_VAULT_ADDRESS?.trim();
const copyTrading = process.env.NEXT_PUBLIC_COPY_TRADING_ADDRESS?.trim();

if (!usdc || !vault) {
  throw new Error("Missing contract addresses");
}

if (!isAddress(usdc) || !isAddress(vault)) {
  throw new Error("Invalid contract addresses");
}

if (copyTrading && !isAddress(copyTrading)) {
  throw new Error("Invalid copy trading contract address");
}

export const CONTRACTS = {
  usdc: usdc as Address,
  vault: vault as Address,
  copyTrading: copyTrading ? (copyTrading as Address) : undefined,
} as const;
