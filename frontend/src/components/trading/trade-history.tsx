import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { ClosedPosition } from "@/types/position";

export function HistoryTable({
  closedPositions,
}: {
  closedPositions: ClosedPosition[];
}) {
  return closedPositions.length === 0 ? (
    <EmptyState text="No trade history" />
  ) : (
    <div className="overflow-x-auto">
      {
        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border">
              <th className="text-left px-4 py-2">Symbol</th>
              <th className="text-left px-4 py-2">Direction</th>
              <th className="text-right px-4 py-2">Quantity</th>
              <th className="text-right px-4 py-2">Entry Price</th>
              <th className="text-right px-4 py-2">Closing Price</th>
              <th className="text-right px-4 py-2">PnL</th>
              <th className="text-right px-4 py-2">Roi</th>
              <th className="text-right px-4 py-2">Open Time</th>
              <th className="text-right px-4 py-2">Closed Time</th>
            </tr>
          </thead>
          <tbody>
            {closedPositions.map((p) => {
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
                    ${Number(p.closing_price).toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right font-mono text-sm",
                      p.Pnl >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {p.Pnl >= 0 ? "+" : ""}${p.Pnl.toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right font-mono text-sm",
                      p.Roi >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {p.Roi >= 0 ? "+" : ""}
                    {p.Roi.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">
                    {formatDateTime(p.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">
                    {formatDateTime(p.updated_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      }
    </div>
  );
}
