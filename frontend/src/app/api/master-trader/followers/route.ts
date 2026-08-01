import { NextRequest, NextResponse } from "next/server";
import { getMasterFollowers } from "@/services/master-followers-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const masterWalletAddress = new URL(req.url).searchParams
    .get("master_wallet_address")
    ?.trim();

  if (!masterWalletAddress) {
    return NextResponse.json(
      { error: "Missing master_wallet_address" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await getMasterFollowers(masterWalletAddress));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
