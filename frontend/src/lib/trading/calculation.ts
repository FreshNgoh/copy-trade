export interface MarginParams {
  quantity: number;
  entry_price: number;
  leverage: number;
  margin?: number;
  fee_rate?: number;
  maintenance_margin_rate?: number;
  direction: "LONG" | "SHORT";
}

export function calculateTradeMetrics({
  quantity,
  entry_price,
  leverage,
  margin,
  direction,
  fee_rate = 0.0005,
  maintenance_margin_rate = 0.005,
}: MarginParams) {
  const notionalValue = quantity * entry_price;

  const initialMargin =
    margin !== undefined && Number.isFinite(margin)
      ? margin
      : notionalValue / leverage;

  const openFee = notionalValue * fee_rate;

  const openCost = initialMargin + openFee;

  const maintenanceMargin = notionalValue * maintenance_margin_rate;

  const liquidationDistance =
    quantity > 0 ? (initialMargin - maintenanceMargin) / quantity : 0;
  const liquidationPrice =
    quantity <= 0
      ? 0
      : direction === "LONG"
        ? entry_price - liquidationDistance
        : entry_price + liquidationDistance;

  return {
    notionalValue,
    initialMargin,
    maintenanceMargin,
    openFee,
    openCost,
    liquidationPrice,
  };
}
