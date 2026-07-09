# TradeHistory Integration

## Data Flow

1. Users create and update orders in the Web2 database.
2. TP, SL, BE, and status changes stay off-chain while the order is active.
3. When an order becomes closed, the backend loads the final order data.
4. The backend writer wallet builds the `TradeRecord` struct and calls `addTradeRecord`.
5. The backend wallet pays gas. The user wallet does not sign and does not pay gas.
6. The confirmed transaction emits `TradeRecordStored`.
7. The backend saves `onChainTradeId`, `onChainTxHash`, and sync metadata to the database.
8. The frontend connects the user's wallet and performs read-only calls to `getUserTradeIds` and `getTradeRecord`.

Admin wallet and backend writer wallet are assigned during deployment. There is no admin page and no frontend write flow.

## Suggested Database Fields

- `onChainSynced: boolean`
- `onChainSyncing: boolean`
- `onChainTradeId: string | null`
- `onChainTxHash: string | null`
- `onChainSyncedAt: Date | null`
- `onChainSyncError: string | null`

Use an atomic update before submission so the same closed order cannot be submitted twice.

## Backend Usage

```ts
import { syncClosedOrderToTradeHistory } from "./src/orders/sync-closed-order-to-chain.js";

await syncClosedOrderToTradeHistory({
  orderId,
  orders: closedOrderRepository
});
```

The repository should only mark an order as syncing when it is closed and not already synced.
