import { copyTradingRepository } from "@/repositories/copy-trading-repository";
import {
  pauseCopySettingsOnChain,
  saveCopySettingsOnChain,
} from "@/lib/web3/copy-trading/server";

export async function saveCopySettings(input: {
  masterWalletAddress: string;
  followerWalletAddress: string;
  maxCopyAmount: number;
  maxAllocationBps: number;
  stopLossBps: number;
  maxDailyTrades: number;
}) {
  const settingsTxHash = await saveCopySettingsOnChain({
    follower: input.followerWalletAddress,
    trader: input.masterWalletAddress,
    maxCopyAmount: input.maxCopyAmount,
    maxAllocationBps: input.maxAllocationBps,
    stopLossBps: input.stopLossBps,
    maxDailyTrades: input.maxDailyTrades,
  });

  return copyTradingRepository.saveCopySettings({ ...input, settingsTxHash });
}

export async function pauseCopySettings(input: {
  masterWalletAddress: string;
  followerWalletAddress: string;
}) {
  const pausedTxHash = await pauseCopySettingsOnChain(
    input.followerWalletAddress,
    input.masterWalletAddress,
  );

  return copyTradingRepository.pauseCopy({ ...input, pausedTxHash });
}
