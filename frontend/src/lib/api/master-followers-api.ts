import type { MasterFollowersSummary } from "@/types/master-follower";

export async function getMasterFollowersApi(masterWalletAddress: string) {
  const params = new URLSearchParams({ master_wallet_address: masterWalletAddress });
  const response = await fetch(`/api/master-trader/followers?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to load followers");
  }

  return data as MasterFollowersSummary;
}
