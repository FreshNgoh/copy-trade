"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { createPositionApi } from "@/lib/api/position-api";
import { createOrderApi } from "@/lib/api/order-api";
import { getTraderDashboardApi } from "@/lib/api/trader-dashboard-api";
import { calculateTradeMetrics, calculateWalletLiquidationPrices } from "@/lib/trading/calculation";
import type { TraderDashboardPosition } from "@/types/trader-dashboard";

export function TradePanel({
  pair,
  midPrice,
  onPositionCreated,
  onOrderCreated,
}: {
  pair?: string;
  midPrice: number;
  onPositionCreated?: () => void;
  onOrderCreated?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const [direction, setDirection] = React.useState<"BUY" | "SELL">("BUY");
  const [type, setType] = React.useState<"MARKET" | "LIMIT">("MARKET");
  const [price, setLimitPrice] = React.useState(midPrice.toFixed(2));
  const [margin, setMargin] = React.useState("");
  const [quantityInput, setQuantityInputValue] = React.useState("");
  const [leverage, setLeverage] = React.useState([5]);
  const [stopLoss, setStopLoss] = React.useState("");
  const [takeProfit, setTakeProfit] = React.useState("");
  const [freeCollateral, setFreeCollateral] = React.useState(0);
  const [manualWalletBalance, setManualWalletBalance] = React.useState(0);
  const [openPositions, setOpenPositions] = React.useState<TraderDashboardPosition[]>([]);
  const orderPrice = type === "MARKET" ? midPrice : Number(price);
  const marginAmount = Number(margin);
  const orderQuantity =
    orderPrice > 0 && marginAmount > 0
      ? (marginAmount * leverage[0]) / orderPrice
      : 0;
  const baseAsset = pair?.split("/")[0] ?? "Asset";
  const metrics = calculateTradeMetrics({
    quantity: orderQuantity,
    entry_price: orderPrice,
    leverage: leverage[0],
    margin: marginAmount,
    direction: direction === "BUY" ? "LONG" : "SHORT",
  });
  const estimatedLiquidationPrice = React.useMemo(() => {
    if (!pair || orderQuantity <= 0 || orderPrice <= 0) return 0;
    const positionDirection: "LONG" | "SHORT" = direction === "BUY" ? "LONG" : "SHORT";
    const manualPositions = openPositions.filter(
      (position) => position.trade_source !== "COPY" && !position.copied_from_master,
    );
    const matching = manualPositions.find(
      (position) => position.symbol === pair && position.direction === positionDirection,
    );
    const previewId = matching?.position_id ?? "preview-position";
    const previewPositions = matching
      ? manualPositions.map((position) => {
          if (position.position_id !== matching.position_id) return position;
          const oldQuantity = Number(position.quantity);
          const nextQuantity = oldQuantity + orderQuantity;
          return {
            ...position,
            quantity: nextQuantity,
            entry_price:
              (oldQuantity * Number(position.entry_price) + orderQuantity * orderPrice) /
              nextQuantity,
          };
        })
      : [...manualPositions, { position_id: previewId, trader_wallet_address: address ?? "", symbol: pair, quantity: orderQuantity, direction: positionDirection, entry_price: orderPrice, leverage: leverage[0], stop_loss: null, take_profit: null, status: "OPEN" as const, created_at: "", updated_at: "", trade_source: "OWN" as const }];
    return calculateWalletLiquidationPrices(previewPositions, {
      manual: manualWalletBalance,
      copy: 0,
    }).find((position) => position.position_id === previewId)?.liquidation_price ?? 0;
  }, [address, direction, leverage, manualWalletBalance, openPositions, orderPrice, orderQuantity, pair]);
  const isOverFreeCollateral =
    marginAmount > 0 && marginAmount > freeCollateral;
  const canSubmit =
    isConnected &&
    freeCollateral > 0 &&
    orderPrice > 0 &&
    marginAmount > 0 &&
    orderQuantity > 0 &&
    !isOverFreeCollateral;

  const loadFreeCollateral = React.useCallback(async () => {
    if (!address) {
      setFreeCollateral(0);
      return;
    }

    try {
      const dashboard = await getTraderDashboardApi(address);
      setFreeCollateral(Number(dashboard.stats.freeCollateral || 0));
      setManualWalletBalance(Number(dashboard.stats.walletBalance || 0));
      setOpenPositions(dashboard.activePositions);
    } catch (error) {
      console.error("Failed to fetch free collateral:", error);
      setFreeCollateral(0);
      setManualWalletBalance(0);
      setOpenPositions([]);
    }
  }, [address]);

  React.useEffect(() => {
    loadFreeCollateral();
  }, [loadFreeCollateral]);

  const setMarginByCollateralPercent = (percent: number) => {
    const nextMargin = freeCollateral * percent;
    const nextQuantity =
      orderPrice > 0 && nextMargin > 0
        ? (nextMargin * leverage[0]) / orderPrice
        : 0;

    setMargin(nextMargin > 0 ? nextMargin.toFixed(2) : "");
    setQuantityInputValue(nextQuantity > 0 ? nextQuantity.toFixed(3) : "");
  };

  const setQuantityInput = (value: string) => {
    setQuantityInputValue(value);

    const quantity = Number(value);
    const nextMargin =
      orderPrice > 0 && leverage[0] > 0 && quantity > 0
        ? (quantity * orderPrice) / leverage[0]
        : 0;

    setMargin(nextMargin > 0 ? nextMargin.toString() : "");
  };

  React.useEffect(() => {
    const quantity = Number(quantityInput);
    const nextMargin =
      orderPrice > 0 && leverage[0] > 0 && quantity > 0
        ? (quantity * orderPrice) / leverage[0]
        : 0;

    setMargin(nextMargin > 0 ? nextMargin.toString() : "");
  }, [leverage, orderPrice, quantityInput]);

  const placeMarketOrder = async () => {
    if (!isConnected || !address) {
      toast.error("Wallet not connected");
      return;
    }

    if (!canSubmit) {
      toast.error(
        isOverFreeCollateral
          ? "Margin exceeds free collateral"
          : "Enter a valid margin amount",
      );
      return;
    }

    try {
      await createPositionApi({
        trader_wallet_address: address,
        symbol: pair,
        quantity: orderQuantity,
        direction: direction === "BUY" ? "LONG" : "SHORT",
        entry_price: type === "MARKET" ? midPrice : Number(price),
        leverage: leverage[0],
        stop_loss: stopLoss ? Number(stopLoss) : null,
        take_profit: takeProfit ? Number(takeProfit) : null,
      });

      toast.success("Position Created", {
        description: `${direction} ${orderQuantity.toFixed(6)} ${baseAsset}`,
      });
      await onPositionCreated();
      await loadFreeCollateral();

      // Reset input
      setMargin("");
      setQuantityInputValue("");
      setStopLoss("");
      setTakeProfit("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create order",
      );
    }
  };

  const placeLimitOrder = async () => {
    if (!isConnected || !address) {
      toast.error("Wallet not connected");
      return;
    }

    if (!canSubmit) {
      toast.error(
        isOverFreeCollateral
          ? "Margin exceeds free collateral"
          : "Enter a valid margin amount",
      );
      return;
    }

    try {
      await createOrderApi({
        trader_wallet_address: address,
        symbol: pair,
        quantity: orderQuantity,
        direction: direction === "BUY" ? "LONG" : "SHORT",
        order_type: type,
        limit_price: Number(price),
        leverage: leverage[0],
        stop_loss: stopLoss ? Number(stopLoss) : null,
        take_profit: takeProfit ? Number(takeProfit) : null,
      });

      toast.success("Order Created", {
        description: `${direction} ${orderQuantity.toFixed(6)} ${baseAsset}`,
      });

      await onOrderCreated();
      await loadFreeCollateral();

      // Reset input
      setLimitPrice(midPrice.toFixed(2));
      setMargin("");
      setQuantityInputValue("");
      setStopLoss("");
      setTakeProfit("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create order",
      );
    }

    // console.log({ price, orderPrice });
  };

  // reset the limit price to mid price when pair changes
  React.useEffect(() => {
    setLimitPrice(midPrice.toFixed(2));
  }, [pair]);

  return (
    <div
      data-testid="trade-panel"
      className="bg-surface border border-border h-full flex flex-col"
    >
      {/* Buy / Sell tabs */}
      <div className="grid grid-cols-2 border-b border-border">
        <button
          data-testid="trade-side-buy"
          onClick={() => setDirection("BUY")}
          className={cn(
            "py-3 text-sm font-medium font-mono uppercase tracking-wider transition-colors",
            direction === "BUY"
              ? "bg-success/15 text-success border-b-2 border-success"
              : "text-muted-foreground hover:text-white",
          )}
        >
          Buy / Long
        </button>
        <button
          data-testid="trade-side-sell"
          onClick={() => setDirection("SELL")}
          className={cn(
            "py-3 text-sm font-medium font-mono uppercase tracking-wider transition-colors",
            direction === "SELL"
              ? "bg-danger/15 text-danger border-b-2 border-danger"
              : "text-muted-foreground hover:text-white",
          )}
        >
          Sell / Short
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Order type */}
        <div className="flex border border-border">
          {(["MARKET", "LIMIT"] as const).map((t) => (
            <button
              key={t}
              data-testid={`order-type-${t.toLowerCase()}`}
              onClick={() => {
                setType(t);

                if (t === "LIMIT") setLimitPrice(midPrice.toFixed(2));
              }}
              className={cn(
                "flex-1 py-1.5 text-[11px] font-mono uppercase tracking-wider transition-colors",
                type === t
                  ? "bg-white text-black"
                  : "text-muted-foreground hover:text-white",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Order Price */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Price
            </span>
          </div>

          {type === "LIMIT" ? (
            <input
              data-testid="trade-price-input"
              type="number"
              value={price}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="w-full bg-background border border-border focus:border-accent outline-none px-3 py-2 font-mono text-sm"
            />
          ) : (
            <div className="w-full bg-background border border-border px-3 py-2 font-mono text-sm text-muted-foreground">
              Fill at market price
            </div>
          )}
        </div>

        {/* Margin */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Quantity
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {baseAsset}
            </span>
          </div>
          <input
            data-testid="trade-size-input"
            type="number"
            value={quantityInput}
            placeholder="0.000"
            onChange={(e) => setQuantityInput(e.target.value)}
            className={cn(
              "w-full bg-background border border-border focus:border-accent outline-none px-3 py-2 font-mono text-sm",
              isOverFreeCollateral && "border-danger focus:border-danger",
            )}
          />
          <div className="grid grid-cols-4 gap-1 mt-1.5">
            {[
              { label: "25%", value: 0.25 },
              { label: "50%", value: 0.5 },
              { label: "75%", value: 0.75 },
              { label: "MAX", value: 1 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => setMarginByCollateralPercent(preset.value)}
                disabled={freeCollateral <= 0}
                className="py-1 text-[10px] font-mono uppercase border border-border hover:border-border-focus text-muted-foreground hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leverage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Leverage
            </span>
            <span className="font-mono text-sm">{leverage[0]}×</span>
          </div>
          <Slider
            data-testid="trade-leverage-slider"
            value={leverage}
            onValueChange={setLeverage}
            min={1}
            max={20}
            step={1}
          />
          <div className="grid grid-cols-5 gap-1 mt-2">
            {[1, 3, 5, 10, 20].map((l) => (
              <button
                key={l}
                onClick={() => setLeverage([l])}
                className={cn(
                  "py-1 text-[10px] font-mono border transition-colors",
                  leverage[0] === l
                    ? "border-accent text-accent bg-accent/10"
                    : "border-border text-muted-foreground hover:border-border-focus",
                )}
              >
                {l}×
              </button>
            ))}
          </div>
        </div>

        {/* TP / SL */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Take Profit
            </span>
            <input
              data-testid="trade-tp-input"
              type="number"
              placeholder="—"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="w-full mt-1 bg-background border border-border focus:border-accent outline-none px-2 py-1.5 font-mono text-xs"
            />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Stop Loss
            </span>
            <input
              data-testid="trade-sl-input"
              type="number"
              placeholder="—"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full mt-1 bg-background border border-border focus:border-accent outline-none px-2 py-1.5 font-mono text-xs"
            />
          </div>
        </div>

        {/* Summary */}

        <div className="pt-3 border-t border-border space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
              Available
            </span>
            <span>${freeCollateral.toFixed(2)}</span>
          </div>
          {isOverFreeCollateral && (
            <div className="mt-1.5 text-[10px] font-mono text-danger">
              Margin exceeds available collateral.
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
              Estimate Liq. Price
            </span>
            <span className="font-mono">
              {estimatedLiquidationPrice > 0
                ? `$${estimatedLiquidationPrice.toFixed(2)}`
                : "-"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
              Cost
            </span>
            <span className="font-mono">${metrics.openCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
              Initial Margin
            </span>
            <span className="font-mono">
              ${metrics.initialMargin.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
              Fees (0.05%)
            </span>
            <span className="font-mono">${metrics.openFee.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <button
        data-testid="trade-submit-button"
        onClick={type === "MARKET" ? placeMarketOrder : placeLimitOrder}
        disabled={!canSubmit}
        className={cn(
          "w-full py-4 font-medium font-mono uppercase tracking-wider text-sm transition-all",
          !canSubmit && "cursor-not-allowed opacity-50",
          direction === "BUY"
            ? "bg-success text-white hover:brightness-110"
            : "bg-danger text-white hover:brightness-110",
        )}
      >
        {direction === "BUY" ? "Place Long Order" : "Place Short Order"}
      </button>
    </div>
  );
}
