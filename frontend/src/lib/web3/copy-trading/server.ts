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

const COPY_TRADING_ABI = [
  {
    type: "event",
    name: "CopySettingsUpdated",
    anonymous: false,
    inputs: [
      { name: "follower", type: "address", indexed: true },
      { name: "trader", type: "address", indexed: true },
      { name: "maxCopyAmount", type: "uint256", indexed: false },
      { name: "maxAllocationBps", type: "uint16", indexed: false },
      { name: "stopLossBps", type: "uint16", indexed: false },
      { name: "maxDailyTrades", type: "uint16", indexed: false },
      { name: "enabled", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CopiedPositionOpened",
    anonymous: false,
    inputs: [
      { name: "positionId", type: "uint256", indexed: true },
      { name: "follower", type: "address", indexed: true },
      { name: "trader", type: "address", indexed: true },
      { name: "symbol", type: "bytes32", indexed: false },
      { name: "direction", type: "uint8", indexed: false },
      { name: "margin", type: "uint256", indexed: false },
      { name: "entryPrice", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "closeCopiedTrade",
    stateMutability: "nonpayable",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "copySettings",
    stateMutability: "view",
    inputs: [
      { name: "follower", type: "address" },
      { name: "trader", type: "address" },
    ],
    outputs: [
      { name: "enabled", type: "bool" },
      { name: "maxCopyAmount", type: "uint256" },
      { name: "maxAllocationBps", type: "uint16" },
      { name: "stopLossBps", type: "uint16" },
      { name: "maxDailyTrades", type: "uint16" },
    ],
  },
  {
    type: "function",
    name: "openCopiedTrade",
    stateMutability: "nonpayable",
    inputs: [
      { name: "follower", type: "address" },
      { name: "trader", type: "address" },
      { name: "symbol", type: "bytes32" },
      { name: "direction", type: "uint8" },
      { name: "requestedMargin", type: "uint256" },
      { name: "entryPrice", type: "uint256" },
    ],
    outputs: [{ name: "positionId", type: "uint256" }],
  },
] as const;

export type EnabledCopyFollower = {
  follower: string;
  maxCopyAmount?: number;
  maxAllocationBps?: number;
};

export type OpenCopiedTradeInput = {
  follower: string;
  trader: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  requestedMargin: number;
  entryPrice: number;
};

export type OpenCopiedTradeResult = {
  follower: string;
  copyPositionId: string;
  margin: number;
  txHash: string;
};

export type CloseCopiedTradeResult = {
  txHash: string;
};

const copyTradingInterface = new Interface(COPY_TRADING_ABI);

export async function getEnabledCopyFollowers(trader: string): Promise<EnabledCopyFollower[]> {
  const context = getCopyTradingReadContext();
  if (!context) return [];

  const traderAddress = getAddress(trader);
  const filter = context.contract.filters.CopySettingsUpdated(null, traderAddress);
  const logs = await context.contract.queryFilter(filter, context.fromBlock, "latest");
  const followerAddresses = new Set<string>();

  for (const log of logs) {
    try {
      const parsed = copyTradingInterface.parseLog(log);
      const follower = parsed?.args.follower;

      if (follower) {
        followerAddresses.add(getAddress(follower));
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  const followers: EnabledCopyFollower[] = [];

  for (const follower of followerAddresses) {
    const settings = await context.contract.copySettings(follower, traderAddress);

    if (settings.enabled) {
      followers.push({
        follower,
        maxCopyAmount: Number(formatUnits(settings.maxCopyAmount, 6)),
        maxAllocationBps: Number(settings.maxAllocationBps),
      });
    }
  }

  return followers;
}

export async function openCopiedTradeOnChain(input: OpenCopiedTradeInput): Promise<OpenCopiedTradeResult> {
  const context = getCopyTradingWriteContext();

  if (!context) {
    throw new Error("Copy trading contract is not configured");
  }

  const contractCode = await context.provider.getCode(context.contract.target);
  if (contractCode === "0x") {
    throw new Error(
      `No CopyTrading contract code found at ${String(
        context.contract.target,
      )}. Check RPC_URL, CHAIN_ID, and COPY_TRADING_CONTRACT_ADDRESS.`,
    );
  }

  const follower = getAddress(input.follower);
  const trader = getAddress(input.trader);
  const settings = await context.contract.copySettings(follower, trader);

  if (!settings.enabled) {
    throw new Error(
      `Copy settings are disabled on-chain for follower ${follower} and trader ${trader} at ${String(
        context.contract.target,
      )}. Ask the follower to confirm copy settings again after updating env addresses.`,
    );
  }

  const tx = await context.contract.openCopiedTrade(
    follower,
    trader,
    encodeBytes32String(input.symbol.trim()),
    input.direction === "LONG" ? 0 : 1,
    scaleUsdc(input.requestedMargin),
    scalePrice(input.entryPrice),
  );
  const receipt = await tx.wait(1);

  if (!receipt) {
    throw new Error(`CopyTrading transaction was not confirmed: ${tx.hash}`);
  }

  if (receipt.status === 0) {
    throw new Error(`CopyTrading transaction reverted: ${receipt.hash}`);
  }

  for (const log of receipt.logs) {
    try {
      const parsed = copyTradingInterface.parseLog(log);

      if (parsed?.name === "CopiedPositionOpened") {
        return {
          follower: getAddress(parsed.args.follower),
          copyPositionId: parsed.args.positionId.toString(),
          margin: Number(formatUnits(parsed.args.margin, 6)),
          txHash: receipt.hash,
        };
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  throw new Error(`CopiedPositionOpened event not found: ${receipt.hash}`);
}

export async function closeCopiedTradeOnChain(positionId: string | number | bigint): Promise<CloseCopiedTradeResult> {
  const context = getCopyTradingWriteContext();

  if (!context) {
    throw new Error("Copy trading contract is not configured");
  }

  const contractCode = await context.provider.getCode(context.contract.target);
  if (contractCode === "0x") {
    throw new Error(
      `No CopyTrading contract code found at ${String(
        context.contract.target,
      )}. Check RPC_URL, CHAIN_ID, and COPY_TRADING_CONTRACT_ADDRESS.`,
    );
  }

  const tx = await context.contract.closeCopiedTrade(BigInt(positionId));
  const receipt = await tx.wait(1);

  if (!receipt) {
    throw new Error(`CopyTrading close transaction was not confirmed: ${tx.hash}`);
  }

  if (receipt.status === 0) {
    throw new Error(`CopyTrading close transaction reverted: ${receipt.hash}`);
  }

  return {
    txHash: receipt.hash,
  };
}

function getCopyTradingReadContext() {
  const rpcUrl = process.env.RPC_URL;
  const contractAddress =
    process.env.COPY_TRADING_CONTRACT_ADDRESS ?? process.env.NEXT_PUBLIC_COPY_TRADING_ADDRESS;
  const chainId = Number(process.env.CHAIN_ID || "11155111");
  const fromBlock = Number(process.env.COPY_TRADING_DEPLOY_BLOCK || "0");

  if (!rpcUrl || !contractAddress || !Number.isFinite(chainId)) return null;

  const provider = new JsonRpcProvider(rpcUrl, chainId);
  const contract = new Contract(getAddress(contractAddress), COPY_TRADING_ABI, provider);

  return {
    contract,
    fromBlock: Number.isFinite(fromBlock) && fromBlock >= 0 ? fromBlock : 0,
  };
}

function getCopyTradingWriteContext() {
  const readContext = getCopyTradingReadContext();
  const privateKey = process.env.COPY_TRADING_EXECUTOR_PRIVATE_KEY ?? process.env.BACKEND_WALLET_PRIVATE_KEY;
  const chainId = Number(process.env.CHAIN_ID || "11155111");

  if (!readContext || !privateKey || !Number.isFinite(chainId)) return null;

  const provider = new JsonRpcProvider(process.env.RPC_URL, chainId);
  const signer = new Wallet(privateKey, provider);

  return {
    contract: readContext.contract.connect(signer) as Contract,
    provider,
  };
}

function scaleUsdc(value: number) {
  return parseUnits(normalizeDecimal(value, 6), 6);
}

function scalePrice(value: number) {
  return parseUnits(normalizeDecimal(value, 2), 2);
}

function normalizeDecimal(value: number, decimals: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid copy trade numeric value: ${value}`);
  }

  return value.toFixed(decimals);
}
