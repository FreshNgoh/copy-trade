import type { OnChainTradeRecord } from "./types";

export type TradeHistorySource = 0 | 1 | 2;

export const TRADE_SOURCE_MANUAL = 0;
export const TRADE_SOURCE_COPY = 1;
export const TRADE_SOURCE_MASTER_COPY = 2;

type TradeSourceOverride = {
  on_chain_trade_id?: string | number | bigint | null;
  trade_source?: string | null;
};

export function getTradeHistoryDisplaySource(
  record: OnChainTradeRecord,
  _verifiedAt?: bigint | null,
): TradeHistorySource {
  const source = Number(record.source);

  if (source === TRADE_SOURCE_COPY) return TRADE_SOURCE_COPY;
  if (source === TRADE_SOURCE_MASTER_COPY) return TRADE_SOURCE_MASTER_COPY;
  return TRADE_SOURCE_MANUAL;
}

export function getTradeHistorySourceLabel(source: TradeHistorySource) {
  switch (source) {
    case TRADE_SOURCE_COPY:
      return "Copy";
    case TRADE_SOURCE_MASTER_COPY:
      return "Master Copy";
    default:
      return "Manual";
  }
}

export function applyTradeHistorySourceOverrides(
  records: OnChainTradeRecord[],
  overrides: TradeSourceOverride[],
) {
  const sourceByTradeId = new Map<string, TradeHistorySource>();

  for (const override of overrides) {
    if (!override.on_chain_trade_id) continue;

    const source = getSourceFromPositionTradeSource(override.trade_source);
    if (source === null) continue;

    sourceByTradeId.set(String(override.on_chain_trade_id), source);
  }

  return records.map((record) => {
    const source = sourceByTradeId.get(record.tradeId.toString());

    return source === undefined ? record : { ...record, source };
  });
}

function getSourceFromPositionTradeSource(value?: string | null) {
  switch (value) {
    case "OWN":
      return TRADE_SOURCE_MANUAL;
    case "COPY":
      return TRADE_SOURCE_COPY;
    case "MASTER_COPY":
      return TRADE_SOURCE_MASTER_COPY;
    default:
      return null;
  }
}
