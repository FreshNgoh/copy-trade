import type { Address, Hex } from "viem";

export type OnChainTradeRecord = {
  tradeId: bigint;
  blockNumber?: bigint | null;
  transactionHash?: Hex | null;
  user: Address;
  master: Address;
  follower: Address;
  openTime: bigint;
  closedTime: bigint;
  direction: number;
  source: number;
  quantityDecimals: number;
  priceDecimals: number;
  pnlDecimals: number;
  roiDecimals: number;
  symbol: Hex;
  quantity: bigint;
  entryPrice: bigint;
  closingPrice: bigint;
  pnl: bigint;
  roi: bigint;
  grossPnl: bigint;
  masterReward: bigint;
  followerReward: bigint;
};
