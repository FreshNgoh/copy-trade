export const masterTraderRegistryAbi = [
  {
    type: "function",
    name: "verifyMaster",
    stateMutability: "nonpayable",
    inputs: [
      { name: "trader", type: "address" },
      { name: "totalTrades", type: "uint256" },
      { name: "roi", type: "int256" },
      { name: "tradingVolume", type: "uint256" },
    ],
    outputs: [],
  },
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
  {
    type: "event",
    name: "MasterTraderVerified",
    anonymous: false,
    inputs: [
      { name: "trader", type: "address", indexed: true },
      { name: "verifier", type: "address", indexed: true },
      { name: "totalTrades", type: "uint256", indexed: false },
      { name: "roi", type: "int256", indexed: false },
      { name: "tradingVolume", type: "uint256", indexed: false },
      { name: "verifiedAt", type: "uint256", indexed: false },
    ],
  },
] as const;
