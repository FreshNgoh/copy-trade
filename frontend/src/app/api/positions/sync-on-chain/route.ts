import { syncClosedPositionById } from "@/services/position-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const positionId = String(body.position_id ?? "").trim();
    const traderWalletAddress = String(body.trader_wallet_address ?? "").trim();

    if (!positionId || !traderWalletAddress) {
      return NextResponse.json(
        { error: "Missing position_id or trader_wallet_address" },
        { status: 400 },
      );
    }

    const position = await syncClosedPositionById({
      positionId,
      traderWalletAddress,
    });

    return NextResponse.json(position, { status: 200 });
  } catch (error) {
    console.error("Sync Closed Position On-Chain Error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
