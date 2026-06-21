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

export function TPSLModal({
  open,
  onOpenChange,
  position,
  onUpdated,
  midPrice,
}) {
  const [takeProfit, setTakeProfit] = React.useState("");
  const [stopLoss, setStopLoss] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (position) {
      setTakeProfit(position.take_profit?.toString() ?? "");
      setStopLoss(position.stop_loss?.toString() ?? "");
    }
  }, [position]);

  const handleConfirm = async () => {
    try {
      setLoading(true);

      const updateTPSL = await updateActivePositionsApi({
        position_id: position.position_id,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border-border text-white">
        <DialogHeader className={""}>
          <DialogTitle>TP/SL for entire position</DialogTitle>
          <DialogDescription>
            Setting TP/SL close to liquidation price may cause the order to
            fail.
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
          </div>

          <div>
            <label className="text-sm font-medium">Stop Loss</label>
            <Input
              type="number"
              placeholder="Enter stop loss price"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="mt-2 bg-background border-border font-mono"
            />
          </div>
        </div>

        <Button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full bg-blue-300 text-black hover:bg-blue-200"
        >
          {loading ? "Updating..." : "Confirm"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
