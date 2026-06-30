import { isAddress, type Address } from "viem";

const usdc = process.env.NEXT_PUBLIC_USDC_ADDRESS?.trim();
const vault = process.env.NEXT_PUBLIC_VAULT_ADDRESS?.trim();

if (!usdc || !vault) {
  throw new Error("Missing contract addresses");
}

if (!isAddress(usdc) || !isAddress(vault)) {
  throw new Error("Invalid contract addresses");
}

export const CONTRACTS = {
  usdc: usdc as Address,
  vault: vault as Address,
} as const;
