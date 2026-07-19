import { getMasterEligibility } from "@/services/master-trader-service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const traderWalletAddress = searchParams.get("trader_wallet_address")?.trim();

    if (!traderWalletAddress) {
      return NextResponse.json({ error: "Missing trader_wallet_address" }, { status: 400 });
    }

    const eligibility = await getMasterEligibility(traderWalletAddress);

    return NextResponse.json(eligibility, { status: 200 });
  } catch (error) {
    console.error("Fetch Master Trader Eligibility Error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
