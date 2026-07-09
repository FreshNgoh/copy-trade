# TradeHistory Contract

## Folder Structure

```text
backend/contracts/
  foundry.toml
  src/
    TradeHistory.sol
  test/
    TradeHistory.t.sol
  script/
    DeployTradeHistory.s.sol
```

## Storage Format

Closed trades are written once by an authorized backend wallet after the Web2 order is final.

- `symbol`: `bytes32`, for example `ethers.encodeBytes32String("BTC/USDC")`
- `direction`: `0 = long`, `1 = short`
- `quantity`: scaled `uint256`, for example `0.050 BTC` with `quantityDecimals = 6` is `50000`
- `entryPrice`, `closingPrice`: scaled `uint256`, for example `$63640.60` with `priceDecimals = 2` is `6364060`
- `pnl`: scaled `int256`, for example `+$5.50` with `pnlDecimals = 2` is `550`
- `roi`: scaled `int256`, for example `+0.86%` with `roiDecimals = 4` is `8600`
- `openTime`, `closedTime`: Unix timestamps

The contract does not store `$`, `%`, or human-readable date strings. The frontend formats values for display.

## Deployment

```shell
export TRADE_HISTORY_ADMIN=0xYourAdminAddress
export TRADE_HISTORY_BACKEND_WRITER=0xYourBackendWallet

forge script script/DeployTradeHistory.s.sol:DeployTradeHistory \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

The admin can grant or revoke `BACKEND_WRITER_ROLE` using OpenZeppelin `AccessControl`.

## Example Frontend Reads

```ts
import { formatUnits, hexToString } from "viem";

const formatSignedUnits = (
  value: bigint,
  decimals: number,
  prefix = "",
  suffix = "",
) => {
  const sign = value < 0n ? "-" : "+";
  const absoluteValue = value < 0n ? -value : value;

  return `${sign}${prefix}${formatUnits(absoluteValue, decimals)}${suffix}`;
};

const ids = await publicClient.readContract({
  address: tradeHistoryAddress,
  abi: tradeHistoryAbi,
  functionName: "getUserTradeIds",
  args: [userAddress],
});

const count = await publicClient.readContract({
  address: tradeHistoryAddress,
  abi: tradeHistoryAbi,
  functionName: "getUserTradeCount",
  args: [userAddress],
});

const record = await publicClient.readContract({
  address: tradeHistoryAddress,
  abi: tradeHistoryAbi,
  functionName: "getTradeRecord",
  args: [ids[0]],
});

const symbol = hexToString(record.symbol).replace(/\0/g, "");

const entryPrice = `$${formatUnits(record.entryPrice, record.priceDecimals)}`;
const closingPrice = `$${formatUnits(record.closingPrice, record.priceDecimals)}`;
const quantity = `${formatUnits(record.quantity, record.quantityDecimals)} BTC`;
const pnl = formatSignedUnits(record.pnl, record.pnlDecimals, "$");
const roi = formatSignedUnits(record.roi, record.roiDecimals, "", "%");
const openedAt = new Date(Number(record.openTime) * 1000).toLocaleString();
const closedAt = new Date(Number(record.closedTime) * 1000).toLocaleString();
```

For very large user histories, use `getUserTradeCount(user)` and `getUserTradeIdAt(user, index)` for pagination instead of loading the full ID array at once.

## Security And Gas Notes

- Users never pay gas because only backend/company wallets call `addTradeRecord`.
- `BACKEND_WRITER_ROLE` limits write access and can be rotated by the admin.
- Records are immutable after storage, matching the requirement that only fully closed trades reach Web3.
- `bytes32` symbols, Unix timestamps, and scaled integers avoid expensive display strings.
- Custom errors are used for cheaper and clearer reverts in contract validation.
- Events allow indexers and backend services to track newly stored records efficiently.
