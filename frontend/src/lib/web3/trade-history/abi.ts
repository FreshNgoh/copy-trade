export const tradeHistoryAbi = [
  {
    type: "function",
    name: "getUserTradeIds",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "getTradeRecord",
    stateMutability: "view",
    inputs: [{ name: "tradeId", type: "uint256" }],
    outputs: [
      {
        name: "record",
        type: "tuple",
        components: [
          { name: "user", type: "address" },
          { name: "openTime", type: "uint64" },
          { name: "closedTime", type: "uint64" },
          { name: "direction", type: "uint8" },
          { name: "quantityDecimals", type: "uint8" },
          { name: "priceDecimals", type: "uint8" },
          { name: "pnlDecimals", type: "uint8" },
          { name: "roiDecimals", type: "uint8" },
          { name: "symbol", type: "bytes32" },
          { name: "quantity", type: "uint256" },
          { name: "entryPrice", type: "uint256" },
          { name: "closingPrice", type: "uint256" },
          { name: "pnl", type: "int256" },
          { name: "roi", type: "int256" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getUserTradeCount",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getUserTradeIdAt",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "index", type: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "event",
    name: "TradeRecordStored",
    anonymous: false,
    inputs: [
      { name: "tradeId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "writer", type: "address", indexed: true },
      { name: "symbol", type: "bytes32", indexed: false },
      { name: "pnl", type: "int256", indexed: false },
      { name: "roi", type: "int256", indexed: false }
    ]
  }
] as const;
