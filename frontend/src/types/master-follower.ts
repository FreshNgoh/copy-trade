export type MasterFollower = {
  id: string;
  followerWalletAddress: string;
  enabled: boolean;
  followedAt: string;
  followedDays: number;
  maxCopyAmount: number;
  realizedEarnings: number;
  masterProfitShare: number;
  copiedTrades: number;
  activeCopiedPositions: number;
  lastCopiedAt: string | null;
};

export type MasterFollowersSummary = {
  followers: MasterFollower[];
  totalFollowers: number;
  activeFollowers: number;
  totalAllocated: number;
  totalFollowerEarnings: number;
  totalMasterProfitShare: number;
};
