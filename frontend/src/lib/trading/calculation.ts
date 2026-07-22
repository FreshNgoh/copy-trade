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

type LiquidationPosition = {
  position_id: string;
  quantity: number;
  entry_price: number;
  direction: "LONG" | "SHORT";
  trade_source?: "OWN" | "MASTER_COPY" | "COPY";
  copied_from_master?: string | null;
};

/**
 * Calculates cross-margin liquidation prices from current wallet equity.
 * Manual and copy positions use separate wallets. Other positions are assumed
 * flat while the selected position moves toward liquidation.
 */
export function calculateWalletLiquidationPrices<T extends LiquidationPosition>(
  positions: T[],
  balances: { manual: number; copy: number },
  maintenanceMarginRate = 0.005,
) {
  const isCopy = (position: T) =>
    position.trade_source === "MASTER_COPY" ||
    position.trade_source === "COPY" ||
    Boolean(position.copied_from_master);
  const maintenance = (position: T) =>
    Number(position.quantity) *
    Number(position.entry_price) *
    maintenanceMarginRate;
  const totalMaintenance = {
    manual: positions
      .filter((position) => !isCopy(position))
      .reduce((sum, position) => sum + maintenance(position), 0),
    copy: positions
      .filter(isCopy)
      .reduce((sum, position) => sum + maintenance(position), 0),
  };

  return positions.map((position) => {
    const wallet = isCopy(position) ? "copy" : "manual";
    const quantity = Number(position.quantity);
    const entryPrice = Number(position.entry_price);
    const equityBuffer = Number(balances[wallet]) - totalMaintenance[wallet];
    const liquidationPrice =
      quantity <= 0
        ? 0
        : position.direction === "LONG"
          ? Math.max(entryPrice - equityBuffer / quantity, 0)
          : entryPrice + equityBuffer / quantity;

    return { ...position, liquidation_price: Math.max(liquidationPrice, 0) };
  });
}
