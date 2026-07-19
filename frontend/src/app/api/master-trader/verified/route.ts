import { getVerifiedMasterTraders } from "@/services/verified-master-service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const traders = await getVerifiedMasterTraders();

    return NextResponse.json(traders, { status: 200 });
  } catch (error) {
    console.error("Fetch Verified Master Traders Error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
