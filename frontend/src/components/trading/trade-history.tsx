import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import {
  bytes32ToString,
  formatPnl,
  formatPrice,
  formatQuantity,
  formatRoi,
  formatTimestamp,
} from "@/lib/web3/trade-history/format";
import type { OnChainTradeRecord } from "@/lib/web3/trade-history/types";

function shortAddress(address?: string | null) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function HistoryTable({
  records,
  isLoading = false,
  error = null,
}: {
  records: OnChainTradeRecord[];
  isLoading?: boolean;
  error?: string | null;
}) {
  if (error) {
    return (
      <div className="border-b border-border px-4 py-8 text-center text-sm text-danger">
        {error}
      </div>
    );
  }

  return records.length === 0 ? (
    <EmptyState
      text={
        isLoading ? "Loading on-chain trade history" : "No on-chain trade history"
      }
    />
  ) : (
    <div className="overflow-x-auto">
      {
        <table className="w-full min-w-[1120px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border">
              <th className="text-left px-4 py-2">Block</th>
              <th className="text-left px-4 py-2">Symbol</th>
              <th className="text-left px-4 py-2">Source</th>
              <th className="text-left px-4 py-2">Direction</th>
              <th className="text-right px-4 py-2">Quantity</th>
              <th className="text-right px-4 py-2">Entry</th>
              <th className="text-right px-4 py-2">Close</th>
              <th className="text-right px-4 py-2">PnL</th>
              <th className="text-right px-4 py-2">Gross</th>
              <th className="text-right px-4 py-2">Split</th>
              <th className="text-right px-4 py-2">ROI</th>
              <th className="text-right px-4 py-2">Opened</th>
              <th className="text-right px-4 py-2">Closed</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const symbol = bytes32ToString(record.symbol);
              const isProfit = record.pnl >= 0n;

              return (
                <tr
                  key={record.tradeId.toString()}
                  className="border-b border-border hover:bg-surface-hover"
                >
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {record.blockNumber ? (
                      <a
                        href={`https://sepolia.etherscan.io/block/${record.blockNumber.toString()}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:text-white"
                      >
                        {record.blockNumber.toString()}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm">{symbol}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    <TradeSource record={record} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "text-[10px] font-mono uppercase px-1.5 py-0.5 border",
                        record.direction === 0
                          ? "border-success text-success"
                          : "border-danger text-danger",
                      )}
                    >
                      {record.direction === 0 ? "Long" : "Short"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm">
                    {formatQuantity(
                      record.quantity,
                      record.quantityDecimals,
                      symbol,
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">
                    {formatPrice(record.entryPrice, record.priceDecimals)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm">
                    {formatPrice(record.closingPrice, record.priceDecimals)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right font-mono text-sm",
                      isProfit ? "text-success" : "text-danger",
                    )}
                  >
                    {formatPnl(record.pnl, record.pnlDecimals)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">
                    {record.source === 0
                      ? "-"
                      : formatPnl(record.grossPnl, record.pnlDecimals)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                    {record.source === 0
                      ? "-"
                      : `M ${formatPnl(record.masterReward, record.pnlDecimals)} / F ${formatPnl(record.followerReward, record.pnlDecimals)}`}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right font-mono text-sm",
                      record.roi >= 0n ? "text-success" : "text-danger",
                    )}
                  >
                    {formatRoi(record.roi, record.roiDecimals)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                    {formatTimestamp(record.openTime)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                    {formatTimestamp(record.closedTime)}
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

function TradeSource({ record }: { record: OnChainTradeRecord }) {
  if (record.source === 1) {
    return (
      <div>
        <div className="text-accent">Copied</div>
        <div className="text-[10px] text-muted-foreground">
          from {shortAddress(record.master)}
        </div>
      </div>
    );
  }

  if (record.source === 2) {
    return (
      <div>
        <div className="text-success">Copy Reward</div>
        <div className="text-[10px] text-muted-foreground">
          from {shortAddress(record.follower)}
        </div>
      </div>
    );
  }

  return <span>Own</span>;
}
