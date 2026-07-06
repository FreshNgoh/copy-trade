import {
  cancelLimitOrder,
  createOrder,
  getLimitOrderPositions,
} from "@/services/order-service";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getTraderWalletAddress(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  return searchParams.get("trader_wallet_address")?.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = await createOrder(body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Position Error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const traderWalletAddress = getTraderWalletAddress(req);

    if (!traderWalletAddress) {
      return NextResponse.json(
        { error: "Missing trader_wallet_address" },
        { status: 400 },
      );
    }

    if (status === "PENDING" || status === "PARTIALLY_FILLED") {
      const orders = await getLimitOrderPositions(traderWalletAddress);
      return NextResponse.json(orders, { status: 200 });
    }

    return NextResponse.json([], { status: 200 });
  } catch (error) {
    console.error("Fetch Orders Error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const orders = await cancelLimitOrder(body);

    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error("Cancel Order Error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}
