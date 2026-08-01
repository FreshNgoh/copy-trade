export async function saveCopySettingsApi(input: {
  masterWalletAddress: string;
  followerWalletAddress: string;
  maxCopyAmount: number;
  maxAllocationBps: number;
  stopLossBps: number;
  maxDailyTrades: number;
  settingsTxHash: string;
}) {
  const response = await fetch("/api/copy-trading/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      master_wallet_address: input.masterWalletAddress,
      follower_wallet_address: input.followerWalletAddress,
      max_copy_amount: input.maxCopyAmount,
      max_allocation_bps: input.maxAllocationBps,
      stop_loss_bps: input.stopLossBps,
      max_daily_trades: input.maxDailyTrades,
      settings_tx_hash: input.settingsTxHash,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to save copy settings");
  }

  return data;
}

export async function pauseCopySettingsApi(input: {
  masterWalletAddress: string;
  followerWalletAddress: string;
  pausedTxHash: string;
}) {
  const response = await fetch("/api/copy-trading/settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      master_wallet_address: input.masterWalletAddress,
      follower_wallet_address: input.followerWalletAddress,
      paused_tx_hash: input.pausedTxHash,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to pause copy settings");
  }

  return data;
}
