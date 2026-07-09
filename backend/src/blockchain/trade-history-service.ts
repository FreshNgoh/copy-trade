import { Contract, Interface, JsonRpcProvider, Wallet, getAddress } from "ethers";
import { tradeHistoryAbi } from "./trade-history-abi.js";

export type TradeRecordInput = {
  user: string;
  openTime: number;
  closedTime: number;
  direction: number;
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
};

export type StoredTradeResult = {
  tradeId: bigint;
  txHash: string;
  blockNumber: number | null;
};

export class TradeHistoryService {
  private readonly contract: Contract;
  private readonly contractInterface = new Interface(tradeHistoryAbi);

  constructor(options?: {
    rpcUrl?: string;
    privateKey?: string;
    contractAddress?: string;
    chainId?: number;
  }) {
    const rpcUrl = options?.rpcUrl ?? process.env.RPC_URL;
    const privateKey = options?.privateKey ?? process.env.BACKEND_WALLET_PRIVATE_KEY;
    const contractAddress = options?.contractAddress ?? process.env.TRADE_HISTORY_CONTRACT_ADDRESS;
    const chainId = options?.chainId ?? Number(process.env.CHAIN_ID);

    if (!rpcUrl) throw new Error("Missing RPC_URL");
    if (!privateKey) throw new Error("Missing BACKEND_WALLET_PRIVATE_KEY");
    if (!contractAddress) throw new Error("Missing TRADE_HISTORY_CONTRACT_ADDRESS");
    if (!Number.isFinite(chainId)) throw new Error("Missing or invalid CHAIN_ID");

    const provider = new JsonRpcProvider(rpcUrl, chainId);
    const signer = new Wallet(privateKey, provider);

    // Admin wallet and backend writer wallet are assigned during deployment.
    // This signer must be the backend writer wallet, and this backend wallet pays gas.
    // The user's wallet never signs here; it is only stored in TradeRecord.user.
    this.contract = new Contract(getAddress(contractAddress), tradeHistoryAbi, signer);
  }

  async addTradeRecord(record: TradeRecordInput): Promise<StoredTradeResult> {
    const tx = await this.contract.addTradeRecord(record);
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error(`TradeHistory transaction was not confirmed: ${tx.hash}`);
    }

    const tradeId = this.extractTradeId(receipt.logs);

    return {
      tradeId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber ?? null
    };
  }

  private extractTradeId(logs: readonly { topics: readonly string[]; data: string }[]): bigint {
    for (const log of logs) {
      try {
        const parsed = this.contractInterface.parseLog(log);

        if (parsed?.name === "TradeRecordStored") {
          return parsed.args.tradeId as bigint;
        }
      } catch {
        // Ignore logs emitted by other contracts in the same transaction.
      }
    }

    throw new Error("TradeRecordStored event not found in transaction receipt");
  }
}
