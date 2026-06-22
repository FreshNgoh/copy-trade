"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { createPositionApi } from "@/lib/api/position-api";
import { createOrderApi } from "@/lib/api/order-api";
import { calculateTradeMetrics } from "@/lib/trading/calculation";

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
  const [price, setLimitPrice] = React.useState(midPrice.toString());
  const [quantity, setQuantity] = React.useState("");
  const [leverage, setLeverage] = React.useState([5]);
  const [stopLoss, setStopLoss] = React.useState("");
  const [takeProfit, setTakeProfit] = React.useState("");
  const orderPrice = type === "MARKET" ? midPrice : Number(price);
  const metrics = calculateTradeMetrics({
    quantity: Number(quantity),
    entry_price: orderPrice,
    leverage: leverage[0],
    direction: direction === "BUY" ? "LONG" : "SHORT",
  });

  const placeMarketOrder = async () => {
    if (!isConnected || !address) {
      toast.error("Wallet not connected");
      return;
    }

    try {
      await createPositionApi({
        trader_wallet_address: address,
        symbol: pair,
        quantity: Number(quantity),
        direction: direction === "BUY" ? "LONG" : "SHORT",
        entry_price: type === "MARKET" ? midPrice : Number(price),
        leverage: leverage[0],
        stop_loss: stopLoss ? Number(stopLoss) : null,
        take_profit: takeProfit ? Number(takeProfit) : null,
      });

      toast.success("Position Created", {
        description: `${direction} ${quantity} ${pair}`,
      });
      await onPositionCreated();

      // Reset input
      setQuantity("");
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

    try {
      await createOrderApi({
        trader_wallet_address: address,
        symbol: pair,
        quantity: Number(quantity),
        direction: direction === "BUY" ? "LONG" : "SHORT",
        order_type: type,
        limit_price: Number(price),
        leverage: leverage[0],
        stop_loss: stopLoss ? Number(stopLoss) : null,
        take_profit: takeProfit ? Number(takeProfit) : null,
      });

      toast.success("Order Created", {
        description: `${direction} ${quantity} ${pair}`,
      });

      await onOrderCreated();

      // Reset input
      setLimitPrice(midPrice.toString());
      setQuantity("");
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
    setLimitPrice(midPrice.toString());
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

                if (t === "LIMIT") setLimitPrice(midPrice.toString());
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

        {/* Quantity */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Quantity
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {pair.split("/")[0]}
            </span>
          </div>
          <input
            data-testid="trade-size-input"
            type="number"
            value={quantity}
            placeholder="Quantity"
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-background border border-border focus:border-accent outline-none px-3 py-2 font-mono text-sm"
          />
          <div className="grid grid-cols-4 gap-1 mt-1.5">
            {["25%", "50%", "75%", "MAX"].map((pct, i) => (
              <button
                key={pct}
                onClick={() => setQuantity(((i + 1) * 0.25 * 2).toFixed(2))}
                className="py-1 text-[10px] font-mono uppercase border border-border hover:border-border-focus text-muted-foreground hover:text-white transition-colors"
              >
                {pct}
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
              Estimate Liq. Price
            </span>
            <span className="font-mono">
              ${metrics.liquidationPrice.toFixed(2)}
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
              Margin
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
        className={cn(
          "w-full py-4 font-medium font-mono uppercase tracking-wider text-sm transition-all",
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
