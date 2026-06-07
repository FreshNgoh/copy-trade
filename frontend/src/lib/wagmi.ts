"use client";

import { http, createConfig } from "wagmi";
import { mainnet, sepolia, arbitrum, base } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
const sepoliaRpc = process.env.NEXT_PUBLIC_SEPOLIA_RPC;

export const wagmiConfig = getDefaultConfig({
  appName: "Alphavault — Web3 Copy Trading",
  projectId,
  chains: [sepolia, mainnet, arbitrum, base],
  transports: {
    [sepolia.id]: http(sepoliaRpc || undefined),
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
  },
  ssr: false,
});
