import {
  closePosition,
  openOrIncreasePosition,
  getClosedPositions,
  getOpenPositions,
  updateActivePositions,
} from "@/services/position-service";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getTraderWalletAddress(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  return searchParams.get("trader_wallet_address")?.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = await openOrIncreasePosition(body);

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

    if (status === "CLOSED") {
      const positions = await getClosedPositions(traderWalletAddress);
      return NextResponse.json(positions, { status: 200 });
    }

    const positions = await getOpenPositions(traderWalletAddress);
    return NextResponse.json(positions, { status: 200 });
  } catch (error) {
    console.error("Fetch Positions Error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const positions = await closePosition(body);

    return NextResponse.json(positions, { status: 200 });
  } catch (error) {
    console.error("Close Position Error:", error);

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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const positions = await updateActivePositions(body);

    return NextResponse.json(positions, { status: 200 });
  } catch (error) {
    console.error("Update Position Error:", error);

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
