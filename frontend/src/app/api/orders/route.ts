import {
  cancelLimitOrder,
  createOrder,
  getLimitOrderPositions,
} from "@/services/order-service";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

    if (status === "PENDING" || "PARTIALLY_FILLED") {
      const orders = await getLimitOrderPositions();
      return NextResponse.json(orders, { status: 200 });
    }
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
