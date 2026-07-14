import type { VerifiedMasterTrader } from "@/types/verified-master";

export async function getVerifiedMasterTradersApi(): Promise<VerifiedMasterTrader[]> {
  const response = await fetch("/api/master-trader/verified", {
    method: "GET",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch verified master traders");
  }

  return data as VerifiedMasterTrader[];
}
