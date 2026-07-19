# MasterTraderRegistry

## Purpose

`MasterTraderRegistry` stores verified master trader status on-chain. Users cannot verify themselves. The backend/company verifier wallet pays gas and calls `verifyMaster` after recalculating eligibility from trusted closed trade records.

## Eligibility

The backend calculates eligibility from `positions` rows where `status = 'CLOSED'`.

- Total closed trades >= `10`
- Average ROI >= `10%`
- Total trading volume >= `10,000 USDC`

The contract enforces the same minimums:

- `MIN_CLOSED_TRADES = 10`
- `MIN_ROI = 100000`, meaning `10.0000%`
- `MIN_TRADING_VOLUME = 10000e6`

## Deploy

```shell
export MASTER_REGISTRY_ADMIN=0xAdmin
export MASTER_VERIFIER_ADDRESS=0xBackendVerifier

forge script script/DeployMasterTraderRegistry.s.sol:DeployMasterTraderRegistry \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## Runtime Environment

```env
MASTER_REGISTRY_CONTRACT_ADDRESS=
MASTER_VERIFIER_PRIVATE_KEY=
RPC_URL=
CHAIN_ID=11155111
```

The private key must stay server-side. Do not expose it with `NEXT_PUBLIC_`.

## API Flow

```txt
GET  /api/master-trader/eligibility?trader_wallet_address=0x...
POST /api/master-trader/verify
```

The verify endpoint recalculates eligibility, rejects ineligible or already verified traders, submits the blockchain transaction, then updates the existing `portfolio` row.
