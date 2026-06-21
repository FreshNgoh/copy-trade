import {
  closePosition,
  createPosition,
  getClosedPositions,
  getOpenPositions,
  updateActivePositions,
} from "@/services/position-service";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = await createPosition(body);

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

    if (status === "CLOSED") {
      const positions = await getClosedPositions();
      return NextResponse.json(positions, { status: 200 });
    }

    const positions = await getOpenPositions();
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
