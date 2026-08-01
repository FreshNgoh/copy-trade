"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { updateActivePositionsApi } from "@/lib/api/position-api";
import { Position, UpdatePosition } from "@/types/position";
import { Alert } from "../ui/alert";
import { cn } from "@/lib/utils";

function estimatePnl(position: Position, targetPrice: number) {
  const priceDifference =
    position.direction === "LONG"
      ? targetPrice - Number(position.entry_price)
      : Number(position.entry_price) - targetPrice;

  return priceDifference * Number(position.quantity);
}

function formatEstimatedPnl(pnl: number) {
  return `${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toFixed(2)} USDC`;
}

export function TPSLModal({
  open,
  onOpenChange,
  position,
  onUpdated,
  midPrice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: Position;
  onUpdated: (position: UpdatePosition) => void;
  midPrice: number;
}) {
  const [takeProfit, setTakeProfit] = React.useState("");
  const [stopLoss, setStopLoss] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const takeProfitPrice = Number(takeProfit);
  const stopLossPrice = Number(stopLoss);
  const liquidationPrice = Number(position?.liquidation_price || 0);
  const takeProfitPnl =
    takeProfit && takeProfitPrice > 0
      ? estimatePnl(position, takeProfitPrice)
      : null;
  const stopLossPnl =
    stopLoss && stopLossPrice > 0
      ? estimatePnl(position, stopLossPrice)
      : null;
  const invalidStopLoss = Boolean(
    stopLoss &&
      stopLossPrice > 0 &&
      liquidationPrice > 0 &&
      (position.direction === "LONG"
        ? stopLossPrice <= liquidationPrice
        : stopLossPrice >= liquidationPrice),
  );
  const invalidPrice = Boolean(
    (takeProfit && (!Number.isFinite(takeProfitPrice) || takeProfitPrice <= 0)) ||
      (stopLoss && (!Number.isFinite(stopLossPrice) || stopLossPrice <= 0)),
  );

  React.useEffect(() => {
    if (position) {
      setTakeProfit(position.take_profit?.toString() ?? "");
      setStopLoss(position.stop_loss?.toString() ?? "");
    }
  }, [open, position]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !loading) {
      setTakeProfit(position.take_profit?.toString() ?? "");
      setStopLoss(position.stop_loss?.toString() ?? "");
    }

    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (invalidStopLoss) {
      toast.error("Stop loss must trigger before the liquidation price");
      return;
    }

    if (invalidPrice) {
      toast.error("TP/SL prices must be greater than 0");
      return;
    }

    try {
      setLoading(true);

      const updateTPSL: UpdatePosition = await updateActivePositionsApi({
        position_id: position.position_id,
        trader_wallet_address: position.trader_wallet_address,
        take_profit: takeProfit ? Number(takeProfit) : null,
        stop_loss: stopLoss ? Number(stopLoss) : null,
      });

      toast.success("TP/SL updated");
      onUpdated(updateTPSL);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update TP/SL",
      );
    } finally {
      setLoading(false);
    }

    console.log(position);
  };

  if (!position) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-surface border-border text-white">
        <DialogHeader className={""}>
          <DialogTitle>TP/SL for entire position</DialogTitle>
          <DialogDescription className="py-3">
            <Alert className="text-muted-foreground font-mono text-xs bg-slate-950">
              Setting TP/SL close to liquidation price may cause the order to
              fail.
            </Alert>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm border-b border-border pb-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Symbol</span>
            <span className="font-mono text-green-400">
              {position.symbol} / {position.direction} {position.leverage}x
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Entry Price</span>
            <span className="font-mono">
              {Number(position.entry_price).toFixed(2)} USDC
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Mark Price</span>
            <span className="font-mono">
              {Number(midPrice).toFixed(2)} USDC
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Liquidation Price</span>
            <span className="font-mono text-warning">
              {liquidationPrice > 0
                ? `${liquidationPrice.toFixed(2)} USDC`
                : "—"}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Take Profit</label>
            <Input
              type="number"
              placeholder="Enter take profit price"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="mt-2 bg-background border-border font-mono"
            />
            {takeProfitPnl !== null && (
              <p
                className={cn(
                  "mt-2 text-xs font-mono",
                  takeProfitPnl >= 0 ? "text-success" : "text-danger",
                )}
              >
                Estimated P&amp;L: {formatEstimatedPnl(takeProfitPnl)}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Stop Loss</label>
            <Input
              type="number"
              placeholder="Enter stop loss price"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              aria-invalid={invalidStopLoss}
              className={cn(
                "mt-2 bg-background border-border font-mono",
                invalidStopLoss && "border-danger focus-visible:ring-danger",
              )}
            />
            {stopLossPnl !== null && (
              <p
                className={cn(
                  "mt-2 text-xs font-mono",
                  stopLossPnl >= 0 ? "text-success" : "text-danger",
                )}
              >
                Estimated P&amp;L: {formatEstimatedPnl(stopLossPnl)}
              </p>
            )}
            {invalidStopLoss && (
              <p className="mt-2 text-xs text-danger" role="alert">
                Stop loss must be {position.direction === "LONG" ? "above" : "below"}{" "}
                the liquidation price ({liquidationPrice.toFixed(2)} USDC).
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={handleConfirm}
          disabled={loading || invalidStopLoss || invalidPrice}
          className="w-full bg-blue-300 text-black hover:bg-blue-200"
        >
          {loading ? "Updating..." : "Confirm"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
