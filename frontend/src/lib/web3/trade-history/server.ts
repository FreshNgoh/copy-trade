import {
  Contract,
  Interface,
  JsonRpcProvider,
  Wallet,
  encodeBytes32String,
  formatUnits,
  getAddress,
  parseUnits,
} from "ethers";
import type { OnChainTradeRecord } from "./types";
import {
  TRADE_SOURCE_MANUAL,
  TRADE_SOURCE_MASTER_COPY,
  applyTradeHistorySourceOverrides,
} from "./source";

const TRADE_HISTORY_WRITE_ABI = [
  {
    type: "function",
    name: "addTradeRecord",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "record",
        type: "tuple",
        components: [
          { name: "user", type: "address" },
          { name: "master", type: "address" },
          { name: "follower", type: "address" },
          { name: "openTime", type: "uint64" },
          { name: "closedTime", type: "uint64" },
          { name: "direction", type: "uint8" },
          { name: "source", type: "uint8" },
          { name: "quantityDecimals", type: "uint8" },
          { name: "priceDecimals", type: "uint8" },
          { name: "pnlDecimals", type: "uint8" },
          { name: "roiDecimals", type: "uint8" },
          { name: "symbol", type: "bytes32" },
          { name: "quantity", type: "uint256" },
          { name: "entryPrice", type: "uint256" },
          { name: "closingPrice", type: "uint256" },
          { name: "pnl", type: "int256" },
          { name: "roi", type: "int256" },
          { name: "grossPnl", type: "int256" },
          { name: "masterReward", type: "int256" },
          { name: "followerReward", type: "int256" },
        ],
      },
    ],
    outputs: [{ name: "tradeId", type: "uint256" }],
  },
  {
    type: "event",
    name: "TradeRecordStored",
    anonymous: false,
    inputs: [
      { name: "tradeId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "writer", type: "address", indexed: true },
      { name: "symbol", type: "bytes32", indexed: false },
      { name: "pnl", type: "int256", indexed: false },
      { name: "roi", type: "int256", indexed: false },
      { name: "source", type: "uint8", indexed: false },
      { name: "master", type: "address", indexed: false },
      { name: "follower", type: "address", indexed: false },
    ],
  },
] as const;

const TRADE_HISTORY_READ_ABI = [
  {
    type: "function",
    name: "getUserTradeIds",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getTradeRecord",
    stateMutability: "view",
    inputs: [{ name: "tradeId", type: "uint256" }],
    outputs: [
      {
        name: "record",
        type: "tuple",
        components: [
          { name: "user", type: "address" },
          { name: "master", type: "address" },
          { name: "follower", type: "address" },
          { name: "openTime", type: "uint64" },
          { name: "closedTime", type: "uint64" },
          { name: "direction", type: "uint8" },
          { name: "source", type: "uint8" },
          { name: "quantityDecimals", type: "uint8" },
          { name: "priceDecimals", type: "uint8" },
          { name: "pnlDecimals", type: "uint8" },
          { name: "roiDecimals", type: "uint8" },
          { name: "symbol", type: "bytes32" },
          { name: "quantity", type: "uint256" },
          { name: "entryPrice", type: "uint256" },
          { name: "closingPrice", type: "uint256" },
          { name: "pnl", type: "int256" },
          { name: "roi", type: "int256" },
          { name: "grossPnl", type: "int256" },
          { name: "masterReward", type: "int256" },
          { name: "followerReward", type: "int256" },
        ],
      },
    ],
  },
] as const;

export type TradeHistoryRecordInput = {
  user: string;
  master: string;
  follower: string;
  openTime: number;
  closedTime: number;
  direction: number;
  source: number;
  quantityDecimals: number;
  priceDecimals: number;
  pnlDecimals: number;
  roiDecimals: number;
  symbol: string;
  quantity: bigint;
  entryPrice: bigint;
  closingPrice: bigint;
  pnl: bigint;
  roi: bigint;
  grossPnl: bigint;
  masterReward: bigint;
  followerReward: bigint;
};

export type StoredTradeHistoryRecord = {
  tradeId: string;
  txHash: string;
};

export type OnChainTradeMetrics = {
  totalTrades: number;
  roi: number;
  winRate: number;
  roiHistory: number[];
  tradingVolume: number;
};

type TradeMetricsSource = "manual" | "master-copy";

type TradeSourceOverride = {
  on_chain_trade_id?: string | number | bigint | null;
  trade_source?: string | null;
};

type OnChainTradeMetricsOptions = {
  source?: TradeMetricsSource;
  verifiedAt?: bigint | number | string | null;
  sourceOverrides?: TradeSourceOverride[];
};

const tradeHistoryInterface = new Interface(TRADE_HISTORY_WRITE_ABI);

export function stringToBytes32(value: string) {
  return encodeBytes32String(value.trim());
}

export function toScaledInteger(value: string | number, decimals: number) {
  return parseUnits(normalizeDecimalString(value, decimals), decimals);
}

function normalizeDecimalString(value: string | number, decimals: number) {
  const cleaned = String(value).replace(/[$,%\s,]/g, "");
  const numberValue = Number(cleaned);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`Invalid numeric value: ${String(value)}`);
  }

  return numberValue.toFixed(decimals);
}

export function toUnixTimestamp(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid timestamp: ${String(value)}`);
  }

  return Math.floor(timestamp / 1000);
}

export async function storeTradeHistoryRecord(record: TradeHistoryRecordInput): Promise<StoredTradeHistoryRecord> {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
  const contractAddress =
    process.env.TRADE_HISTORY_CONTRACT_ADDRESS ?? process.env.NEXT_PUBLIC_TRADE_HISTORY_CONTRACT_ADDRESS;
  const chainId = Number(process.env.CHAIN_ID || "11155111");

  if (!rpcUrl) throw new Error("Missing RPC_URL in frontend/.env.local");
  if (!privateKey) throw new Error("Missing BACKEND_WALLET_PRIVATE_KEY in frontend/.env.local");
  if (!contractAddress) throw new Error("Missing TRADE_HISTORY_CONTRACT_ADDRESS in frontend/.env.local");
  if (!Number.isFinite(chainId)) throw new Error("Invalid CHAIN_ID in frontend/.env.local");

  const provider = new JsonRpcProvider(rpcUrl, chainId);
  const signer = new Wallet(privateKey, provider);

  // Admin and backend writer roles are assigned during deployment.
  // This server-side backend writer wallet pays Sepolia gas.
  // The user's wallet is only stored in TradeRecord.user and never signs this transaction.
  const contract = new Contract(getAddress(contractAddress), TRADE_HISTORY_WRITE_ABI, signer);
  const tx = await contract.addTradeRecord(record);
  const receipt = await tx.wait(1);

  if (!receipt) {
    throw new Error(`TradeHistory transaction was not confirmed: ${tx.hash}`);
  }

  for (const log of receipt.logs) {
    try {
      const parsed = tradeHistoryInterface.parseLog(log);

      if (parsed?.name === "TradeRecordStored") {
        return {
          tradeId: parsed.args.tradeId.toString(),
          txHash: receipt.hash,
        };
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  throw new Error(`TradeRecordStored event not found: ${receipt.hash}`);
}

export async function getOnChainTradeMetrics(
  traderWalletAddress: string,
  options: OnChainTradeMetricsOptions = {},
): Promise<OnChainTradeMetrics> {
  const rpcUrl = process.env.RPC_URL;
  const contractAddress =
    process.env.TRADE_HISTORY_CONTRACT_ADDRESS ?? process.env.NEXT_PUBLIC_TRADE_HISTORY_CONTRACT_ADDRESS;
  const chainId = Number(process.env.CHAIN_ID || "11155111");

  if (!rpcUrl) throw new Error("Missing RPC_URL");
  if (!contractAddress) throw new Error("Missing TRADE_HISTORY_CONTRACT_ADDRESS");
  if (!Number.isFinite(chainId)) throw new Error("Invalid CHAIN_ID");

  const provider = new JsonRpcProvider(rpcUrl, chainId);
  const contract = new Contract(getAddress(contractAddress), TRADE_HISTORY_READ_ABI, provider);
  const tradeIds: bigint[] = await contract.getUserTradeIds(getAddress(traderWalletAddress));
  const records = await Promise.all(
    tradeIds.map(async (tradeId) =>
      normalizeTradeRecord(tradeId, await contract.getTradeRecord(tradeId)),
    ),
  );
  const correctedRecords = applyTradeHistorySourceOverrides(
    records,
    options.sourceOverrides ?? [],
  );
  const verifiedAt = normalizeOptionalBigInt(options.verifiedAt);
  const expectedSource =
    options.source === "master-copy"
      ? TRADE_SOURCE_MASTER_COPY
      : TRADE_SOURCE_MANUAL;
  const metricRecords = correctedRecords.filter((record) => {
    if (Number(record.source) !== expectedSource) return false;

    return (
      expectedSource !== TRADE_SOURCE_MASTER_COPY ||
      verifiedAt === null ||
      record.closedTime >= verifiedAt
    );
  });

  const totalTrades = metricRecords.length;
  const tradingVolume = metricRecords.reduce((total, record) => {
    const quantity = Number(formatUnits(record.quantity, record.quantityDecimals));
    const entryPrice = Number(formatUnits(record.entryPrice, record.priceDecimals));

    return total + quantity * entryPrice;
  }, 0);
  const roi =
    totalTrades === 0
      ? 0
      : metricRecords.reduce((total, record) => total + Number(formatUnits(record.roi, record.roiDecimals)), 0) /
        totalTrades;
  const winRate = totalTrades === 0
    ? 0
    : (metricRecords.filter((record) => record.pnl > 0n).length / totalTrades) * 100;
  let cumulativeRoi = 0;
  const roiHistory = [...metricRecords]
    .sort((a, b) => Number(a.closedTime - b.closedTime))
    .map((record) => {
      cumulativeRoi += Number(formatUnits(record.roi, record.roiDecimals));
      return cumulativeRoi;
    });

  return {
    totalTrades,
    roi,
    winRate,
    roiHistory,
    tradingVolume,
  };
}

function normalizeOptionalBigInt(value?: bigint | number | string | null) {
  if (value === undefined || value === null || value === "") return null;
  return BigInt(value);
}

function normalizeTradeRecord(
  tradeId: bigint,
  record: Record<string, unknown>,
): OnChainTradeRecord {
  return {
    tradeId,
    blockNumber: null,
    transactionHash: null,
    user: getAddress(String(record.user)) as `0x${string}`,
    master: getAddress(String(record.master)) as `0x${string}`,
    follower: getAddress(String(record.follower)) as `0x${string}`,
    openTime: BigInt(String(record.openTime)),
    closedTime: BigInt(String(record.closedTime)),
    direction: Number(record.direction),
    source: Number(record.source),
    quantityDecimals: Number(record.quantityDecimals),
    priceDecimals: Number(record.priceDecimals),
    pnlDecimals: Number(record.pnlDecimals),
    roiDecimals: Number(record.roiDecimals),
    symbol: String(record.symbol) as `0x${string}`,
    quantity: BigInt(String(record.quantity)),
    entryPrice: BigInt(String(record.entryPrice)),
    closingPrice: BigInt(String(record.closingPrice)),
    pnl: BigInt(String(record.pnl)),
    roi: BigInt(String(record.roi)),
    grossPnl: BigInt(String(record.grossPnl)),
    masterReward: BigInt(String(record.masterReward)),
    followerReward: BigInt(String(record.followerReward)),
  };
}
