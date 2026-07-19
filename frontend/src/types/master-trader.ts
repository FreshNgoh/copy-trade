export type MasterEligibilityStatus =
  | "NOT_ELIGIBLE"
  | "ELIGIBLE"
  | "VERIFYING"
  | "VERIFIED"
  | "FAILED";

export type MasterEligibilityMetric = {
  current: number | string;
  target: number | string;
  met: boolean;
};

export type MasterEligibilityResponse = {
  eligible: boolean;
  alreadyVerified: boolean;
  status: MasterEligibilityStatus;
  totalTrades: {
    current: number;
    target: number;
    met: boolean;
  };
  roi: {
    current: string;
    target: string;
    met: boolean;
  };
  tradingVolume: {
    current: string;
    target: string;
    met: boolean;
  };
  verificationTxHash?: string | null;
  verifiedAt?: string | null;
  error?: string | null;
};

export type EligibilityRequirement = {
  key: "totalTrades" | "roi" | "tradingVolume";
  label: string;
  current: string;
  target: string;
  met: boolean;
};

export type VerifyMasterResponse = {
  traderWalletAddress?: string;
  txHash?: string;
  blockNumber?: number | null;
  eligibility?: unknown;
  portfolio?: unknown;
};
