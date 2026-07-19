import { copyTradingRepository } from "@/repositories/copy-trading-repository";

export async function saveCopySettings(input: {
  masterWalletAddress: string;
  followerWalletAddress: string;
  maxCopyAmount: number;
  maxAllocationBps: number;
  stopLossBps: number;
  maxDailyTrades: number;
  settingsTxHash: string;
}) {
  return copyTradingRepository.saveCopySettings(input);
}

export async function pauseCopySettings(input: {
  masterWalletAddress: string;
  followerWalletAddress: string;
  pausedTxHash: string;
}) {
  return copyTradingRepository.pauseCopy(input);
}
