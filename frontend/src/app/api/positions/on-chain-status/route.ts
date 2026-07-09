import { positionRepository } from "@/repositories/position-repository";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const positionId = searchParams.get("position_id")?.trim();
    const traderWalletAddress = searchParams
      .get("trader_wallet_address")
      ?.trim();

    if (!positionId || !traderWalletAddress) {
      return NextResponse.json(
        { error: "Missing position_id or trader_wallet_address" },
        { status: 400 },
      );
    }

    const status = await positionRepository.getOnChainSyncStatus({
      positionId,
      traderWalletAddress,
    });

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error("Fetch On-Chain Sync Status Error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
