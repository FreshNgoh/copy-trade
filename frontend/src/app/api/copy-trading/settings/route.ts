import { pauseCopySettings, saveCopySettings } from "@/services/copy-settings-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await saveCopySettings({
      masterWalletAddress: requireAddress(body.master_wallet_address, "master_wallet_address"),
      followerWalletAddress: requireAddress(body.follower_wallet_address, "follower_wallet_address"),
      maxCopyAmount: requirePositiveNumber(body.max_copy_amount, "max_copy_amount"),
      maxAllocationBps: requirePositiveNumber(body.max_allocation_bps, "max_allocation_bps"),
      stopLossBps: requirePositiveNumber(body.stop_loss_bps, "stop_loss_bps"),
      maxDailyTrades: requirePositiveNumber(body.max_daily_trades, "max_daily_trades"),
      settingsTxHash: requireString(body.settings_tx_hash, "settings_tx_hash"),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await pauseCopySettings({
      masterWalletAddress: requireAddress(body.master_wallet_address, "master_wallet_address"),
      followerWalletAddress: requireAddress(body.follower_wallet_address, "follower_wallet_address"),
      pausedTxHash: requireString(body.paused_tx_hash, "paused_tx_hash"),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}

function requireAddress(value: unknown, name: string) {
  const address = requireString(value, name);

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid ${name}`);
  }

  return address;
}

function requireString(value: unknown, name: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ${name}`);
  }

  return value.trim();
}

function requirePositiveNumber(value: unknown, name: string) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`Invalid ${name}`);
  }

  return numberValue;
}
