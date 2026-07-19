export const masterTraderRegistryReadAbi = [
  {
    type: "function",
    name: "isVerifiedMaster",
    stateMutability: "view",
    inputs: [{ name: "trader", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getMasterVerification",
    stateMutability: "view",
    inputs: [{ name: "trader", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "verified", type: "bool" },
          { name: "verifiedAt", type: "uint64" },
          { name: "verifiedBy", type: "address" },
          { name: "totalTrades", type: "uint256" },
          { name: "roi", type: "int256" },
          { name: "tradingVolume", type: "uint256" },
        ],
      },
    ],
  },
] as const;
