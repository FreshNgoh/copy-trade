import { verifyMasterTrader } from "@/services/master-trader-service";
import { requireValidVerifyMasterIntent } from "@/lib/web3/eip712-verify";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const traderWalletAddress = String(body.trader_wallet_address ?? "").trim();
    const signature = String(body.signature ?? "").trim();
    const deadline = String(body.deadline ?? "").trim();

    if (!traderWalletAddress) {
      return NextResponse.json({ error: "Missing trader_wallet_address" }, { status: 400 });
    }

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    if (!deadline) {
      return NextResponse.json({ error: "Missing deadline" }, { status: 400 });
    }

    requireValidVerifyMasterIntent({
      trader: traderWalletAddress,
      signature,
      deadline: BigInt(deadline),
    });

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
