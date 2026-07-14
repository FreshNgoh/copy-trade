import type {
  MasterEligibilityResponse,
  MasterEligibilityStatus,
  VerifyMasterResponse,
} from "@/types/master-trader";

type RawEligibilityResponse = Partial<MasterEligibilityResponse> & {
  totalTrades?: number | MasterEligibilityResponse["totalTrades"];
  roi?: number | string | MasterEligibilityResponse["roi"];
  tradingVolume?: number | string | MasterEligibilityResponse["tradingVolume"];
  requirements?: {
    totalTrades?: { required: number; actual: number; passed: boolean };
    roi?: { required: number; actual: number; passed: boolean };
    tradingVolume?: { required: number; actual: number; passed: boolean };
  };
  portfolio?: {
    masterStatus?: string;
    isVerifiedMaster?: boolean;
    masterVerifiedAt?: string | null;
    masterVerificationTxHash?: string | null;
    masterVerificationError?: string | null;
  };
};

export async function getMasterEligibilityApi(
  traderWalletAddress: string,
): Promise<MasterEligibilityResponse> {
  const params = new URLSearchParams({
    trader_wallet_address: traderWalletAddress,
  });

  const response = await fetch(
    `/api/master-trader/eligibility?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch master eligibility");
  }

  return normalizeEligibility(data);
}

export async function verifyMasterTraderApi(
  traderWalletAddress: string,
): Promise<VerifyMasterResponse> {
  const response = await fetch("/api/master-trader/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trader_wallet_address: traderWalletAddress,
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to verify master trader");
  }

  return data as VerifyMasterResponse;
}

function normalizeEligibility(
  data: RawEligibilityResponse,
): MasterEligibilityResponse {
  if (
    typeof data.totalTrades === "object" &&
    typeof data.roi === "object" &&
    typeof data.tradingVolume === "object" &&
    data.status
  ) {
    return data as MasterEligibilityResponse;
  }

  const totalTradesActual =
    data.requirements?.totalTrades?.actual ?? numberValue(data.totalTrades);
  const totalTradesTarget = data.requirements?.totalTrades?.required ?? 10;
  const roiActual = data.requirements?.roi?.actual ?? numberValue(data.roi);
  const roiTarget = data.requirements?.roi?.required ?? 10;
  const volumeActual =
    data.requirements?.tradingVolume?.actual ??
    numberValue(data.tradingVolume);
  const volumeTarget = data.requirements?.tradingVolume?.required ?? 10_000;
  const alreadyVerified =
    data.alreadyVerified ?? Boolean(data.portfolio?.isVerifiedMaster);
  const backendStatus =
    data.status ?? mapPortfolioStatus(data.portfolio?.masterStatus);
  const eligible =
    data.eligible ??
    (totalTradesActual >= totalTradesTarget &&
      roiActual >= roiTarget &&
      volumeActual >= volumeTarget);
  const status = alreadyVerified
    ? "VERIFIED"
    : backendStatus === "VERIFYING" || backendStatus === "FAILED"
      ? backendStatus
      : eligible
        ? "ELIGIBLE"
        : "NOT_ELIGIBLE";

  return {
    eligible,
    alreadyVerified,
    status,
    totalTrades: {
      current: totalTradesActual,
      target: totalTradesTarget,
      met: data.requirements?.totalTrades?.passed ?? totalTradesActual >= totalTradesTarget,
    },
    roi: {
      current: `${formatNumber(roiActual)}%`,
      target: `${formatNumber(roiTarget)}%`,
      met: data.requirements?.roi?.passed ?? roiActual >= roiTarget,
    },
    tradingVolume: {
      current: `${formatNumber(volumeActual)} USDC`,
      target: `${formatNumber(volumeTarget)} USDC`,
      met:
        data.requirements?.tradingVolume?.passed ??
        volumeActual >= volumeTarget,
    },
    verificationTxHash:
      data.verificationTxHash ?? data.portfolio?.masterVerificationTxHash ?? null,
    verifiedAt: data.verifiedAt ?? data.portfolio?.masterVerifiedAt ?? null,
    error: data.error ?? data.portfolio?.masterVerificationError ?? null,
  };
}

function mapPortfolioStatus(status?: string): MasterEligibilityStatus {
  switch (status) {
    case "VERIFIED":
      return "VERIFIED";
    case "PENDING":
      return "VERIFYING";
    case "FAILED":
      return "FAILED";
    default:
      return "NOT_ELIGIBLE";
  }
}

function numberValue(value: unknown) {
  if (typeof value === "object" && value !== null && "current" in value) {
    return numberValue((value as { current: unknown }).current);
  }

  const parsed = Number(String(value ?? 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}
