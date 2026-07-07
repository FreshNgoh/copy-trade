import type { TraderDashboard } from "@/types/trader-dashboard";

export async function getTraderDashboardApi(traderWalletAddress: string) {
  const params = new URLSearchParams({
    trader_wallet_address: traderWalletAddress,
  });

  const response = await fetch(`/api/trader-dashboard?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch trader dashboard");
  }

  return data as TraderDashboard;
}

export async function ensureTraderPortfolioApi(traderWalletAddress: string) {
  const response = await fetch("/api/trader-dashboard", {
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
    throw new Error(data.error || "Failed to create trader portfolio");
  }

  return data;
}

export async function addTraderDepositApi({
  traderWalletAddress,
  amount,
}: {
  traderWalletAddress: string;
  amount: number;
}) {
  const response = await fetch("/api/trader-dashboard", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trader_wallet_address: traderWalletAddress,
      amount,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to update wallet balance");
  }

  return data;
}
