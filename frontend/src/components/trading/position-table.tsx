import { closePositionApi } from "@/lib/api/position-api";
import { EmptyState } from "./empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import React from "react";
import { TPSLModal } from "./setting-profit";

export function PositionsTable({
  activePositions,
  activePair,
  setActivePositions,
  setClosedPositions,
}) {
  const [openTPSL, setOpenTPSL] = React.useState(false);
  const [selectedPosition, setSelectedPosition] = React.useState(null);

  return activePositions.length === 0 ? (
    <EmptyState text="No open positions" />
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border">
            <th className="text-left px-4 py-2">Symbol</th>
            <th className="text-left px-4 py-2">Direction</th>
            <th className="text-right px-4 py-2">Quantity</th>
            <th className="text-right px-4 py-2">Entry Price</th>
            <th className="text-right px-4 py-2">Mark Price</th>
            <th className="text-right px-4 py-2">Liq Price</th>
            <th className="text-right px-4 py-2">PnL</th>
            <th className="text-right px-4 py-2">ROI</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {activePositions.map((p) => {
            const markPrice = activePair.price;

            const pnl =
              p.direction === "LONG"
                ? (markPrice - p.entry_price) * p.quantity
                : (p.entry_price - markPrice) * p.quantity;

            const roi = (pnl / (p.entry_price * p.quantity)) * p.leverage * 100;

            const handleClosePosition = async () => {
              console.log(p);
              try {
                await closePositionApi({
                  position_id: p.position_id,
                  trader_wallet_address: p.trader_wallet_address,
                  closing_price: markPrice,
                  updated_at: new Date().toISOString(),
                  status: "CLOSED",
                  Pnl: pnl,
                  Roi: roi,
                });

                // refresh positions
                setActivePositions((prev) =>
                  prev.filter(
                    (position) => position.position_id !== p.position_id,
                  ),
                );

                // show in trade history
                setClosedPositions((prev) => [
                  {
                    ...p,
                    status: "CLOSED",
                    closing_price: markPrice,
                    Pnl: pnl,
                    Roi: roi,
                    updated_at: new Date(),
                  },
                  ...prev,
                ]);

                toast.success("Position closed successfully");
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Failed to close position",
                );
              }
            };

            return (
              <tr
                key={p.position_id}
                className="border-b border-border hover:bg-surface-hover"
              >
                <td className="px-4 py-2.5 font-mono text-sm">{p.symbol}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "text-[10px] font-mono uppercase px-1.5 py-0.5 border",
                      p.direction === "LONG"
                        ? "border-success text-success"
                        : "border-danger text-danger",
                    )}
                  >
                    {p.direction} {p.leverage}×
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm">
                  {Number(p.quantity).toFixed(3)}
                  {" " + p.symbol.split("/")[0]}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">
                  ${Number(p.entry_price).toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm">
                  ${Number(markPrice).toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm text-warning">
                  {/* ${Number(p.liquidation_price.toLocaleString())} */}
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right font-mono text-sm",
                    pnl >= 0 ? "text-success" : "text-danger",
                  )}
                >
                  {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right font-mono text-sm",
                    roi >= 0 ? "text-success" : "text-danger",
                  )}
                >
                  {roi >= 0 ? "+" : ""}
                  {roi.toFixed(2)}%
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    className="text-[10px] uppercase font-mono border border-border px-2 py-1 hover:border-blue-500 hover:text-blue-300"
                    onClick={() => {
                      console.log(p);
                      setSelectedPosition(p);
                      setOpenTPSL(true);
                    }}
                  >
                    TP/SL
                  </button>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="text-[10px] uppercase font-mono border border-border px-2 py-1 hover:border-danger hover:text-danger">
                        Close
                      </button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader className={""}>
                        <AlertDialogTitle>Close Position</AlertDialogTitle>

                        <AlertDialogDescription>
                          Are you sure to close this position at market price?
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter className={""}>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>

                        <AlertDialogAction
                          onClick={() => handleClosePosition()}
                        >
                          Confirm
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {selectedPosition && (
        <TPSLModal
          open={openTPSL}
          onOpenChange={setOpenTPSL}
          position={selectedPosition}
          onUpdated={(updatedPosition) => {
            setActivePositions((prev) =>
              prev.map((p) =>
                p.position_id === updatedPosition.position_id
                  ? updatedPosition
                  : p,
              ),
            );
          }}
          midPrice={activePair.price}
        />
      )}
    </div>
  );
}
