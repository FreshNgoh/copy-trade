"use client";

import { http } from "wagmi";
import { mainnet, sepolia, arbitrum, base, foundry } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  phantomWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";
const sepoliaRpc = process.env.NEXT_PUBLIC_SEPOLIA_RPC;
const browserWallets = [phantomWallet, injectedWallet, metaMaskWallet];

if (typeof window !== "undefined" && projectId) {
  browserWallets.push(walletConnectWallet);
}

export const wagmiConfig = getDefaultConfig({
  appName: "Alphavault — Web3 Copy Trading",
  projectId,
  wallets: [
    {
      groupName: "Wallets",
      wallets: browserWallets,
    },
  ],
  chains: [foundry, sepolia, mainnet, arbitrum, base],
  transports: {
    [foundry.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(sepoliaRpc || undefined),
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
  },
  ssr: true,
});
