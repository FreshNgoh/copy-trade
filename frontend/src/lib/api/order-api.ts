import { CancelLimitOrder, CreateOrderDTO } from "@/types/limit-order";

export async function createOrderApi(order: CreateOrderDTO) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to create limit order");
  }

  console.log("Order created:", data);

  return data;
}

export async function getLimitOrdersApi(traderWalletAddress: string) {
  const params = new URLSearchParams({
    status: "PENDING",
    trader_wallet_address: traderWalletAddress,
  });

  const response = await fetch(`/api/orders?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log("Orders fetched:", data);
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch limit order");
  }

  return data;
}

export async function cancelOrderApi(order: CancelLimitOrder) {
  const response = await fetch("/api/orders", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });

  const data = await response.json();

  console.log("Order cancelled:", data);

  if (!response.ok) {
    throw new Error(data.error || "Failed to cancel order");
  }

  return data;
}
