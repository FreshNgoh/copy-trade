export interface MarginParams {
  quantity: number;
  entry_price: number;
  leverage: number;
  fee_rate?: number;
  maintenance_margin_rate?: number;
  direction: "LONG" | "SHORT";
}

export function calculateTradeMetrics({
  quantity,
  entry_price,
  leverage,
  direction,
  fee_rate = 0.0005,
  maintenance_margin_rate = 0.005,
}: MarginParams) {
  const notionalValue = quantity * entry_price;

  const initialMargin = notionalValue / leverage;

  const openFee = notionalValue * fee_rate;

  const openCost = initialMargin + openFee;

  const maintenanceMargin = notionalValue * maintenance_margin_rate;

  const liquidationPrice =
    direction === "LONG"
      ? entry_price * (1 - 1 / leverage + maintenance_margin_rate)
      : entry_price * (1 + 1 / leverage - maintenance_margin_rate);

  return {
    notionalValue,
    initialMargin,
    maintenanceMargin,
    openFee,
    openCost,
    liquidationPrice,
  };
}
