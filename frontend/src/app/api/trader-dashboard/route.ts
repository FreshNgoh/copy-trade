import {
  addTraderWalletBalance,
  ensureTraderPortfolio,
  getTraderDashboard,
  transferCopyWalletToManualWallet,
  withdrawTraderWalletBalance,
} from "@/services/trader-dashboard-service";
import { NextRequest, NextResponse } from "next/server";

function getTraderWalletAddress(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  return searchParams.get("trader_wallet_address")?.trim();
}

export async function GET(req: NextRequest) {
  try {
    const traderWalletAddress = getTraderWalletAddress(req);

    if (!traderWalletAddress) {
      return NextResponse.json(
        { error: "Missing trader_wallet_address" },
        { status: 400 },
      );
    }

    const dashboard = await getTraderDashboard(traderWalletAddress);

    return NextResponse.json(dashboard, { status: 200 });
  } catch (error) {
    console.error("Fetch Trader Dashboard Error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const traderWalletAddress = body.trader_wallet_address?.trim();

    if (!traderWalletAddress) {
      return NextResponse.json(
        { error: "Missing trader_wallet_address" },
        { status: 400 },
      );
    }

    const portfolio = await ensureTraderPortfolio(traderWalletAddress);

    return NextResponse.json(portfolio, { status: 201 });
  } catch (error) {
    console.error("Create Trader Portfolio Error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const traderWalletAddress = body.trader_wallet_address?.trim();
    const amount = Number(body.amount);

    if (!traderWalletAddress) {
      return NextResponse.json(
        { error: "Missing trader_wallet_address" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid deposit amount" },
        { status: 400 },
      );
    }

    let portfolio;

    if (body.action === "withdraw") {
      portfolio = await withdrawTraderWalletBalance({
        traderWalletAddress,
        amount,
      });
    } else if (body.action === "transfer_copy_to_manual") {
      portfolio = await transferCopyWalletToManualWallet({
        traderWalletAddress,
        amount,
      });
    } else {
      portfolio = await addTraderWalletBalance({
        traderWalletAddress,
        amount,
      });
    }

    return NextResponse.json(portfolio, { status: 200 });
  } catch (error) {
    console.error("Update Trader Portfolio Error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
