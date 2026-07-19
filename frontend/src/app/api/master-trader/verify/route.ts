import { verifyMasterTrader } from "@/services/master-trader-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const traderWalletAddress = String(body.trader_wallet_address ?? "").trim();

    if (!traderWalletAddress) {
      return NextResponse.json({ error: "Missing trader_wallet_address" }, { status: 400 });
    }

    const result = await verifyMasterTrader(traderWalletAddress);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Verify Master Trader Error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
