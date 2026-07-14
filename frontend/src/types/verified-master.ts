export type VerifiedMasterTrader = {
  traderId: string;
  traderWalletAddress: `0x${string}`;
  displayName: string;
  followers: number;
  walletBalance: number;
  totalTrades: number;
  roi: number;
  tradingVolume: number;
  verifiedAt: string | null;
  verificationTxHash: string | null;
};
