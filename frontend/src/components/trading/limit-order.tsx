import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { formatDateTime } from "@/lib/format-date";
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
import { cancelOrderApi } from "@/lib/api/order-api";
import type { LimitOrder } from "@/types/limit-order";

export function LimitOrder({
  orderPosition,
  setActiveOrders,
}: {
  orderPosition: LimitOrder[];
  setActiveOrders: (position) => void;
}) {
  const handleCancelOrder = async (order: LimitOrder) => {
    console.log(order);
    try {
      await cancelOrderApi({
        order_id: order.order_id,
        updated_at: new Date(),
        status: "CANCELLED",
      });

      // refresh positions
      setActiveOrders((prev: LimitOrder[]) =>
        prev.filter((o) => o.order_id !== order.order_id),
      );

      toast.success("Order cancel successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel order",
      );
    }
  };

  return orderPosition.length === 0 ? (
    <EmptyState text="No open positions" />
  ) : (
    <div className="overflow-x-auto">
      {
        <div className="overflow-x-auto">
          {
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-2">Symbol</th>
                  <th className="text-left px-4 py-2">Direction</th>
                  <th className="text-right px-4 py-2">Entry Price</th>
                  <th className="text-right px-4 py-2">Quantity</th>
                  <th className="text-right px-4 py-2">Filled Quantity</th>
                  <th className="text-right px-4 py-2">Created Time</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {orderPosition.map((o) => {
                  return (
                    <tr
                      key={o.order_id}
                      className="border-b border-border hover:bg-surface-hover"
                    >
                      <td className="px-4 py-2.5 font-mono text-sm">
                        {o.symbol}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "text-[10px] font-mono uppercase px-1.5 py-0.5 border",
                            o.direction === "LONG"
                              ? "border-success text-success"
                              : "border-danger text-danger",
                          )}
                        >
                          {o.direction} {o.leverage}×
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">
                        ${Number(o.limit_price).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">
                        {Number(o.quantity).toFixed(3)}
                        {" " + o.symbol.split("/")[0]}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">
                        {Number(o.filled_quantity).toFixed(3)}
                        {" " + o.symbol.split("/")[0]}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">
                        {formatDateTime(o.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="text-[10px] uppercase font-mono border border-border px-2 py-1 hover:border-danger hover:text-danger">
                              Cancel
                            </button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader className={""}>
                              <AlertDialogTitle>Cancel Order</AlertDialogTitle>

                              <AlertDialogDescription>
                                Are you sure you want to cancel this order? This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter className={""}>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>

                              <AlertDialogAction
                                onClick={() => handleCancelOrder(o)}
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
          }
        </div>
      }
    </div>
  );
}
