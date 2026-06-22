import { processPendingOrders } from "@/services/order-service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { symbol, bestBid, bestAsk, askQty, bidQty } = await req.json();

  await processPendingOrders({
    symbol,
    bestBid: Number(bestBid),
    bestAsk: Number(bestAsk),
    askQty: Number(askQty),
    bidQty: Number(bidQty),
  });

  return NextResponse.json({ success: true });
}
