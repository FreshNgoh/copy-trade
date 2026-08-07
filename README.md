# KopiTrade

KopiTrade is a Web3 copy-trading platform for crypto derivatives-style trading workflows. It combines a Next.js trading terminal, Supabase-backed application state, and Solidity contracts that anchor deposits, copy settings, master-trader verification, copy-trading margin controls, and immutable closed trade history on-chain.

The project is designed for traders who want to trade manually, become verified master traders, follow other traders, and audit important trading records through Sepolia/Etherscan.

## Table Of Contents

- [Overview](#overview)
- [Major Features](#major-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running The Project](#running-the-project)
- [API Documentation](#api-documentation)
- [Smart Contracts Covered](#smart-contracts-covered)
- [Database Schema](#database-schema)
- [Workflow](#workflow)
- [Testing](#testing)
- [Deployment Notes](#deployment-notes)

## Overview

### What The Project Does

KopiTrade provides an end-to-end copy-trading experience:

- Traders can connect a wallet, deposit virtual USDC or ETH-backed margin, open and close positions, and review performance.
- Eligible users can become verified master traders through an on-chain registry.
- Followers can allocate a copy wallet balance to verified masters and configure copy limits.
- Master trades can be mirrored to followers by an authorized backend executor.
- Closed trades are synchronized to the `TradeHistory` smart contract for on-chain auditability.
- Explore and trader-profile pages read verified master and trade-history data from chain where possible.

### The Problem It Solves

Most copy-trading systems rely heavily on centralized databases. That makes it hard for users to verify whether a trader is truly qualified, whether closed-trade history was modified, or whether copy-trading rules were enforced consistently.

KopiTrade improves transparency by moving key trust boundaries on-chain:

- Master-trader verification is stored in `MasterTraderRegistry`.
- Closed trade records are stored in `TradeHistory`.
- Copy-trading settings and copied-position state are stored in `CopyTrading`.
- Margin accounting is guarded by `MarginVault`.
- ETH/USDC conversion uses a Chainlink ETH/USD price feed instead of a fixed demo price.

### Who It Is For

- Retail users who want to copy verified traders.
- Skilled traders who want to become master traders and earn from copied trades.
- Developers researching hybrid Web2/Web3 trading architecture.
- Teams building proof-of-concept copy-trading, social trading, or on-chain audit systems.

## Major Features

### Frontend

- Wallet connection with RainbowKit, Wagmi, Viem, and MetaMask-style wallet avatars.
- Trading terminal at `/trade` with:
  - Pair selection.
  - Market and limit order UI.
  - Long/short controls.
  - Take-profit and stop-loss settings.
  - Open position management.
  - On-chain trade history display.
- Dashboard at `/dashboard` with:
  - Portfolio summary.
  - Wallet and copy-wallet balances.
  - Open positions and recent activity.
  - Master Trader Eligibility.
- Performance dashboard at `/dashboard/performance` with:
  - On-chain closed trade breakdown.
  - Filters for all, manual, copy, and master-copy trade sources.
  - Etherscan links for contract and block-level inspection.
- Explore page at `/explore` showing verified master traders.
- Trader profile pages at `/traders/[address]` showing master-trader profile and master-trade history.
- Follower dashboard at `/dashboard/followers`.
- Transfer dashboard at `/dashboard/transfer`.
- Notification center at `/notifications`.
- Copy settings modal with EIP-712 user intent signing.
- Master verification flow with EIP-712 user intent signing.

### Backend And Server-Side Application Logic

This repository uses Next.js API routes as the main application backend, plus a small TypeScript backend package for blockchain formatting and sync helpers.

Major backend capabilities include:

- Supabase repositories for positions, orders, portfolio, copy settings, and dashboard state.
- Market and limit order APIs.
- Position open, close, update, and on-chain sync APIs.
- Copy-trading settings and pause APIs.
- Master-trader eligibility and verification APIs.
- Verified master list APIs.
- Follower summary and follower performance APIs.
- TradeHistory sync with deterministic `orderHash` anchoring.
- EIP-712 signature verification for sensitive user intents.
- On-chain reads for master registry, trade history, and copy-trading events.

## System Architecture

```text
User Wallet
  |
  | RainbowKit / Wagmi / Viem
  v
Next.js Frontend
  |
  | UI components, hooks, API clients
  v
Next.js API Routes
  |
  |-------------------------------|
  |                               |
  v                               v
Supabase Database             Web3 Server Modules
  |                               |
  | positions/orders/portfolio    | ethers/viem RPC calls
  | copy follower settings        |
  |                               v
  |                         Sepolia Contracts
  |                         - MockUSDC
  |                         - MarginVault
  |                         - CopyTrading
  |                         - TradeHistory
  |                         - MasterTraderRegistry
  |
  v
Dashboard, Explore, Trade History, Performance Views
```

### Data Boundary

KopiTrade is a hybrid application:

- Supabase stores application state that supports the trading UI and internal workflow.
- Smart contracts store security-critical or audit-critical state.
- The frontend increasingly reads trading history and master-trader data from chain.
- The backend remains responsible for order execution simulation, closed-position calculations, copy execution orchestration, and submitting authorized contract writes.

## Tech Stack

### Frontend

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Radix UI primitives
- shadcn-style UI components
- RainbowKit
- Wagmi
- Viem
- Ethers v6
- TanStack React Query
- Recharts
- Lightweight Charts
- Supabase JS

### Backend

- Next.js API routes
- TypeScript service and repository layers
- Supabase service-role client
- Ethers v6 for server-side contract writes
- Viem for frontend/on-chain reads and formatting

### Smart Contracts

- Solidity `^0.8.20`
- Foundry
- OpenZeppelin AccessControl
- OpenZeppelin ERC20 utilities
- Chainlink-style `AggregatorV3Interface`

### Infrastructure

- Supabase PostgreSQL
- Sepolia testnet
- Alchemy or another Ethereum RPC provider
- Etherscan for contract and block inspection
- WalletConnect project ID for RainbowKit

## Folder Structure

```text
copy-trade/
├── README.md
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── blockchain/
│   │   │   ├── trade-history-abi.ts
│   │   │   ├── trade-history-format.ts
│   │   │   └── trade-history-service.ts
│   │   └── orders/
│   │       └── sync-closed-order-to-chain.ts
│   └── contracts/
│       ├── foundry.toml
│       ├── script/
│       │   ├── Deploy.s.sol
│       │   ├── DeployCopyTrading.s.sol
│       │   ├── DeployMasterTraderRegistry.s.sol
│       │   └── DeployTradeHistory.s.sol
│       ├── src/
│       │   ├── CopyTrading.sol
│       │   ├── MarginVault.sol
│       │   ├── MasterTraderRegistry.sol
│       │   ├── MockUSDC.sol
│       │   └── TradeHistory.sol
│       └── test/
│           ├── CopyTrading.t.sol
│           ├── MarginVault.t.sol
│           ├── MasterTraderRegistry.t.sol
│           └── TradeHistory.t.sol
└── frontend/
    ├── package.json
    ├── src/
    │   ├── app/
    │   │   ├── api/
    │   │   ├── dashboard/
    │   │   ├── explore/
    │   │   ├── trade/
    │   │   └── traders/[address]/
    │   ├── components/
    │   ├── hooks/
    │   ├── lib/
    │   │   ├── api/
    │   │   ├── supabase/
    │   │   ├── trading/
    │   │   └── web3/
    │   ├── repositories/
    │   ├── services/
    │   └── types/
    └── tailwind.config.js
```

## Prerequisites

Install the following before running the project:

- Node.js 20 or newer.
- npm and/or Yarn 1.x.
- Foundry (`forge`, `cast`, `anvil`).
- A Supabase project.
- A Sepolia RPC URL, for example from Alchemy.
- A funded Sepolia wallet for deployments and backend writer/executor actions.
- WalletConnect project ID for RainbowKit.
- MetaMask or another EIP-1193 wallet.

Recommended:

- Etherscan account/API key if you plan to verify deployed contracts.
- A separate backend/company wallet for contract writer roles.

## Installation

Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd copy-trade
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Install backend TypeScript dependencies:

```bash
cd ../backend
npm install
```

Install Solidity dependencies:

```bash
cd contracts
forge install
```

If Foundry dependencies are already present in `backend/contracts/lib`, `forge install` may not be necessary.

## Environment Variables

Create `frontend/.env.local` and `backend/.env` for local development. Some server-side variables are read from the Next.js runtime, so during local development it is common to mirror backend Web3 variables into `frontend/.env.local` as well.

### Frontend

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_WC_PROJECT_ID=
NEXT_PUBLIC_SEPOLIA_RPC=
NEXT_PUBLIC_CHAIN_ID=11155111

NEXT_PUBLIC_USDC_ADDRESS=
NEXT_PUBLIC_VAULT_ADDRESS=
NEXT_PUBLIC_COPY_TRADING_ADDRESS=

NEXT_PUBLIC_TRADE_HISTORY_CONTRACT_ADDRESS=
NEXT_PUBLIC_TRADE_HISTORY_DEPLOYMENT_BLOCK=

NEXT_PUBLIC_MASTER_REGISTRY_CONTRACT_ADDRESS=
NEXT_PUBLIC_MASTER_REGISTRY_DEPLOYMENT_BLOCK=

RPC_URL=
CHAIN_ID=11155111
BACKEND_WALLET_PRIVATE_KEY=

COPY_TRADING_EXECUTOR_PRIVATE_KEY=
COPY_TRADING_CONTRACT_ADDRESS=
COPY_TRADING_DEPLOY_BLOCK=

TRADE_HISTORY_CONTRACT_ADDRESS=

MASTER_REGISTRY_CONTRACT_ADDRESS=
MASTER_VERIFIER_PRIVATE_KEY=
```

### Backend

```env
RPC_URL=
CHAIN_ID=11155111
ETH_USD_PRICE_FEED=0x694AA1769357215DE4FAC081bf1f309aDC325306

BACKEND_WALLET_PRIVATE_KEY=

TRADE_HISTORY_ADMIN=
TRADE_HISTORY_BACKEND_WRITER=
TRADE_HISTORY_CONTRACT_ADDRESS=

MASTER_REGISTRY_ADMIN=
MASTER_VERIFIER_ADDRESS=
MASTER_REGISTRY_CONTRACT_ADDRESS=
MASTER_VERIFIER_PRIVATE_KEY=

COPY_TRADING_EXECUTOR_PRIVATE_KEY=
COPY_TRADING_CONTRACT_ADDRESS=
COPY_TRADING_DEPLOY_BLOCK=
VAULT_CONTRACT_ADDRESS=
```

### Important Environment Notes

- `NEXT_PUBLIC_*` values are exposed to the browser. Do not put private keys in `NEXT_PUBLIC_*` variables.
- `BACKEND_WALLET_PRIVATE_KEY`, `COPY_TRADING_EXECUTOR_PRIVATE_KEY`, and `MASTER_VERIFIER_PRIVATE_KEY` must stay server-side.
- `COPY_TRADING_DEPLOY_BLOCK`, `NEXT_PUBLIC_TRADE_HISTORY_DEPLOYMENT_BLOCK`, and `NEXT_PUBLIC_MASTER_REGISTRY_DEPLOYMENT_BLOCK` should be set to the block where each contract was deployed. This keeps event scans small and avoids RPC `eth_getLogs` range failures.
- Sepolia Chainlink ETH/USD price feed used by the deploy script: `0x694AA1769357215DE4FAC081bf1f309aDC325306`.

## Running The Project

### Start The Frontend

```bash
cd frontend
npm run dev
```

The app runs at:

```text
http://localhost:3000
```

### Typecheck Backend Helpers

```bash
cd backend
npm run typecheck
```

### Build And Test Contracts

```bash
cd backend/contracts
forge build
forge test
```

### Deploy Core Trading Contracts

The main deployment script deploys `MockUSDC`, `MarginVault`, and `CopyTrading`, grants `CopyTrading` the vault margin manager role, and logs deployed addresses.

```bash
cd backend/contracts

forge script script/Deploy.s.sol:Deploy \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

After deployment, update:

```env
NEXT_PUBLIC_USDC_ADDRESS=
NEXT_PUBLIC_VAULT_ADDRESS=
NEXT_PUBLIC_COPY_TRADING_ADDRESS=
COPY_TRADING_CONTRACT_ADDRESS=
COPY_TRADING_DEPLOY_BLOCK=
```

### Deploy Trade History

```bash
cd backend/contracts

forge script script/DeployTradeHistory.s.sol:DeployTradeHistory \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

Update:

```env
TRADE_HISTORY_CONTRACT_ADDRESS=
NEXT_PUBLIC_TRADE_HISTORY_CONTRACT_ADDRESS=
NEXT_PUBLIC_TRADE_HISTORY_DEPLOYMENT_BLOCK=
```

### Deploy Master Trader Registry

```bash
cd backend/contracts

forge script script/DeployMasterTraderRegistry.s.sol:DeployMasterTraderRegistry \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

Update:

```env
MASTER_REGISTRY_CONTRACT_ADDRESS=
NEXT_PUBLIC_MASTER_REGISTRY_CONTRACT_ADDRESS=
NEXT_PUBLIC_MASTER_REGISTRY_DEPLOYMENT_BLOCK=
```

## API Documentation

API routes live under `frontend/src/app/api`. They are implemented as Next.js Route Handlers.

### Positions

#### `POST /api/positions`

Creates a market position.

Typical body:

```json
{
  "trader_wallet_address": "0x...",
  "symbol": "BTC/USDC",
  "quantity": 0.01,
  "direction": "LONG",
  "entry_price": 65000,
  "leverage": 5,
  "stop_loss": null,
  "take_profit": null,
  "trade_source": "OWN"
}
```

#### `GET /api/positions?trader_wallet_address=0x...&status=OPEN`

Returns positions for a wallet. `status` is optional.

#### `PUT /api/positions`

Closes an open position and calculates realized PnL/ROI.

#### `PATCH /api/positions`

Updates editable position risk settings such as take profit and stop loss.

#### `GET /api/positions/on-chain-status?position_id=...&trader_wallet_address=0x...`

Returns on-chain sync status for a closed position.

#### `POST /api/positions/sync-on-chain`

Synchronizes a closed position to `TradeHistory`.

### Orders

#### `POST /api/orders`

Creates a limit order.

#### `GET /api/orders?trader_wallet_address=0x...&status=PENDING`

Returns orders for a wallet. `status` is optional.

#### `PUT /api/orders`

Updates order fill status or cancels an order depending on request body.

#### `POST /api/orders/match`

Runs order matching logic for pending limit orders.

### Trader Dashboard

#### `GET /api/trader-dashboard?trader_wallet_address=0x...`

Returns portfolio, balances, active positions, closed positions, open orders, and performance statistics.

#### `POST /api/trader-dashboard`

Creates or ensures a portfolio row for a wallet.

#### `PATCH /api/trader-dashboard`

Updates portfolio balances, followers, verification metadata, or copy-wallet transfers depending on the action payload.

### Copy Trading

#### `POST /api/copy-trading/settings`

Stores copy settings for a follower/master pair. Requires signed EIP-712 user intent.

Typical body:

```json
{
  "master_wallet_address": "0x...",
  "follower_wallet_address": "0x...",
  "max_copy_amount": 100,
  "max_allocation_bps": 2000,
  "stop_loss_bps": 1000,
  "max_daily_trades": 5,
  "signature": "0x...",
  "deadline": 1780000000
}
```

#### `PATCH /api/copy-trading/settings`

Pauses copy settings for a follower/master pair. Requires signed EIP-712 user intent.

### Master Trader

#### `GET /api/master-trader/eligibility?trader_wallet_address=0x...`

Calculates whether a trader meets the current master-trader eligibility requirements.

Current contract requirements:

- At least `1` closed manual trade.
- At least `50 USDC` trading volume.

#### `POST /api/master-trader/verify`

Verifies an eligible trader on `MasterTraderRegistry`. Requires signed EIP-712 user intent.

#### `GET /api/master-trader/verified`

Returns verified master traders for the Explore page.

#### `GET /api/master-trader/followers?master_wallet_address=0x...`

Returns follower summary for a master trader.

#### `GET /api/master-trader/follower-performance?master_wallet_address=0x...`

Returns copied-trade performance data for a master trader's followers.

## Smart Contracts Covered

### `MockUSDC`

Demo ERC20 token with 6 decimals.

Primary responsibilities:

- Mint initial supply to deployer.
- Provide test/demo USDC for local and Sepolia workflows.
- Expose `mint(address,uint256)` for demo token distribution.

### `MarginVault`

Virtual margin vault for wallet and copy-trading collateral.

Primary responsibilities:

- Accept USDC deposits.
- Accept ETH deposits and convert to virtual USDC using Chainlink ETH/USD.
- Allow USDC withdrawals.
- Allow ETH withdrawals if the vault has enough ETH liquidity.
- Track user balances and used margin.
- Lock and release margin for authorized copy-trading contracts.
- Reject stale, future-dated, or invalid oracle prices.

Important roles:

- `DEFAULT_ADMIN_ROLE`
- `MARGIN_MANAGER_ROLE`

### `CopyTrading`

Stores follower copy settings and copied-position state.

Primary responsibilities:

- Store copy settings for follower/master pairs.
- Allow users or authorized backend executor to configure copy settings.
- Pause copying.
- Open copied positions through `EXECUTOR_ROLE`.
- Enforce max copy amount, max allocation BPS, stop loss BPS, and max daily trades.
- Lock and release copied margin in `MarginVault`.

Important roles:

- `DEFAULT_ADMIN_ROLE`
- `EXECUTOR_ROLE`

### `TradeHistory`

Immutable closed-trade history store.

Primary responsibilities:

- Store final closed-trade records.
- Track trade IDs by user wallet.
- Store manual, copied follower, and master-copy records.
- Emit `TradeRecordStored`.
- Store `orderHash` to anchor the on-chain record to an off-chain order or position.

Important roles:

- `DEFAULT_ADMIN_ROLE`
- `BACKEND_WRITER_ROLE`

Trade sources:

- `0`: Manual.
- `1`: Copy.
- `2`: Master copy.

### `MasterTraderRegistry`

Registry for verified master traders.

Primary responsibilities:

- Store master verification status.
- Store verification snapshot: total trades, ROI, trading volume, verification timestamp, verifier wallet.
- Enforce minimum closed trades and trading volume.

Important roles:

- `DEFAULT_ADMIN_ROLE`
- `MASTER_VERIFIER_ROLE`

Current eligibility constants:

- `MIN_CLOSED_TRADES = 1`
- `MIN_TRADING_VOLUME = 50e6`

## Database Schema

The application uses Supabase PostgreSQL. The following schema is inferred from the repository and type usage. Your live Supabase project should include compatible tables and indexes.

### `portfolio`

Stores wallet-level dashboard state.

| Column | Purpose |
| --- | --- |
| `trader_id` | Primary identifier for portfolio row. |
| `trader_wallet_address` | Wallet address. |
| `wallet_balance` | Manual trading wallet balance. |
| `copy_wallet_balance` | Balance allocated to copy trading. |
| `positions` | Position count or cached open-position count. |
| `followers` | Cached follower count for master trader. |
| `is_verified_master` | Whether wallet is a verified master. |
| `master_verified_at` | Verification timestamp. |
| `verification_tx_hash` | Master registry verification transaction hash. |
| `verification_block` | Verification block number. |
| `created_at` | Row creation timestamp. |
| `updated_at` | Last update timestamp. |

Recommended indexes:

- Unique index on `lower(trader_wallet_address)`.

### `positions`

Stores open and closed trading positions.

| Column | Purpose |
| --- | --- |
| `position_id` | Unique position identifier. |
| `trader_wallet_address` | Wallet that owns the position. |
| `symbol` | Market symbol, for example `BTC/USDC`. |
| `quantity` | Position size. |
| `direction` | `LONG` or `SHORT`. |
| `entry_price` | Entry price. |
| `closing_price` | Closing price for closed positions. |
| `leverage` | Position leverage. |
| `stop_loss` | Optional stop-loss price. |
| `take_profit` | Optional take-profit price. |
| `liquidation_price` | Optional liquidation price. |
| `status` | `OPEN`, `CLOSED`, `CANCELLED`, or `LIQUIDATED`. |
| `Pnl` | Realized profit/loss. |
| `Roi` | Realized return on investment. |
| `trade_source` | `OWN`, `COPY`, or `MASTER_COPY`. |
| `copied_from_master` | Master wallet address for copied trades. |
| `copy_trade_position_id` | On-chain copied position ID. |
| `copy_trade_position_ids` | Related copied position IDs. |
| `gross_pnl` | Gross PnL before copy split. |
| `master_reward` | Master reward amount. |
| `follower_reward` | Follower reward amount. |
| `on_chain_synced` | Whether closed trade was written to `TradeHistory`. |
| `on_chain_syncing` | Whether sync is currently in progress. |
| `on_chain_trade_id` | Scoped or raw on-chain trade ID. |
| `on_chain_tx_hash` | TradeHistory transaction hash. |
| `on_chain_sync_error` | Last sync error. |
| `created_at` | Open timestamp. |
| `updated_at` | Last update or close timestamp. |

Recommended indexes:

- `lower(trader_wallet_address), status`
- `lower(copied_from_master), trade_source`
- `on_chain_synced`

### `orders`

Stores limit orders and market-order intent records.

| Column | Purpose |
| --- | --- |
| `order_id` | Unique order identifier. |
| `trader_wallet_address` | Wallet that owns the order. |
| `symbol` | Market symbol. |
| `direction` | `LONG` or `SHORT`. |
| `order_type` | `MARKET` or `LIMIT`. |
| `quantity` | Order quantity. |
| `filled_quantity` | Filled quantity. |
| `limit_price` | Limit price. |
| `average_fill_price` | Average fill price. |
| `leverage` | Intended leverage. |
| `stop_loss` | Optional stop loss. |
| `take_profit` | Optional take profit. |
| `status` | `PENDING`, `PARTIALLY_FILLED`, `FILLED`, `CANCELLED`, or `EXPIRED`. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |

Recommended indexes:

- `lower(trader_wallet_address), status`
- `symbol, status`

### `copy_trading_followers`

Stores follower/master copy settings and cached copy status.

| Column | Purpose |
| --- | --- |
| `id` | Unique row ID. |
| `master_wallet_address` | Master trader wallet. |
| `follower_wallet_address` | Follower wallet. |
| `max_copy_amount` | Maximum copy allocation in USDC. |
| `max_allocation_bps` | Max allocation per copied trade in BPS. |
| `stop_loss_bps` | Stop-loss threshold in BPS. |
| `max_daily_trades` | Maximum copied trades per day. |
| `enabled` | Whether copying is active. |
| `settings_tx_hash` | On-chain settings transaction hash. |
| `paused_tx_hash` | Pause transaction hash. |
| `last_copied_at` | Last copied trade timestamp. |
| `last_copy_status` | Last copy execution status. |
| `last_copy_error` | Last copy execution error. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |

Recommended indexes:

- Unique index on `lower(master_wallet_address), lower(follower_wallet_address)`.
- `lower(master_wallet_address), enabled`
- `lower(follower_wallet_address), enabled`

## Workflow

### Manual Trading Workflow

1. User connects wallet.
2. User deposits USDC or ETH-backed virtual USDC into `MarginVault`.
3. User opens a manual position from `/trade`.
4. Position is stored in Supabase as `trade_source = OWN`.
5. User closes the position.
6. PnL and ROI are calculated.
7. Closed position is synchronized to `TradeHistory`.
8. Trade history and dashboard performance read the on-chain record.

### Master Trader Verification Workflow

1. User completes the eligibility requirements.
2. Eligibility service reads closed manual trade history.
3. User signs an EIP-712 `BecomeMaster` intent.
4. API verifies the signature and deadline.
5. Backend verifier wallet calls `MasterTraderRegistry.verifyMaster`.
6. Portfolio verification metadata is updated.
7. Explore page displays the verified master from on-chain registry data.

### Copy Settings Workflow

1. Follower opens a verified master profile.
2. Follower configures max copy amount, allocation BPS, stop loss, and daily trade limit.
3. Follower signs an EIP-712 copy-settings intent.
4. API verifies the signature.
5. Backend/executor stores settings on `CopyTrading`.
6. Supabase stores a query-friendly copy settings row.
7. Master follower count is refreshed.

### Copy Trade Execution Workflow

1. Master opens a trade in copy mode.
2. Backend finds enabled followers for that master.
3. Backend executor calls `CopyTrading.openCopiedTrade` for each eligible follower.
4. `CopyTrading` enforces follower limits.
5. `MarginVault` locks copied margin.
6. Supabase creates follower copy positions with `trade_source = COPY`.
7. Master trade is tracked as `trade_source = MASTER_COPY`.
8. When the master trade closes, follower copied trades close and rewards are calculated.
9. Closed records sync to `TradeHistory`.

### Trade History Audit Workflow

1. Closed position creates a deterministic `orderHash`.
2. Backend writer calls `TradeHistory.addTradeRecord`.
3. Contract validates source, participants, timestamps, direction, symbol, and `orderHash`.
4. Contract emits `TradeRecordStored`.
5. UI displays the record with block or contract links to Etherscan.
6. User can compare off-chain position/order data with the on-chain `orderHash`.

## Testing

### Frontend Typecheck

```bash
cd frontend
npx tsc --noEmit
```

### Backend Typecheck

```bash
cd backend
npm run typecheck
```

### Solidity Tests

```bash
cd backend/contracts
forge test
```

Focused test examples:

```bash
forge test --match-contract MarginVaultTest
forge test --match-contract CopyTradingTest
forge test --match-contract TradeHistoryTest
forge test --match-contract MasterTraderRegistryTest
```

## Deployment Notes

- Redeploy `MarginVault` whenever constructor arguments or price-feed logic changes.
- Redeploy `CopyTrading` when the vault address changes, because `CopyTrading` stores the vault address immutably.
- Redeploy `TradeHistory` when the record struct or ABI changes.
- Redeploy `MasterTraderRegistry` when eligibility constants or verification storage change.
- Always update the matching frontend ABI JSON files after contract changes.
- Always update deployment block values after redeploying event-scanned contracts.
- If users have balances in an old `MarginVault`, they do not automatically migrate to a new vault. Plan a withdrawal or migration flow.

## Security And Trust Assumptions

- Backend writer and executor wallets are privileged. Protect their private keys carefully.
- EIP-712 signatures protect user intent for sensitive API actions, but current contract writes are still submitted by backend roles.
- Supabase uses a service-role key in server-side code. Never expose it to browser code.
- Demo `MockUSDC` is not production USDC.
- Chainlink price feed checks reject stale, future-dated, or invalid oracle answers, but production systems should also consider circuit breakers, pausable operations, and broader oracle risk controls.

## Current Limitations

- The trading engine is application-level and demo-oriented; it is not connected to a real derivatives venue.
- `MockUSDC` is intended for local/Sepolia testing only.
- On-chain event reads depend on RPC limits. Deployment block variables should be set accurately.
- Historical Supabase rows may need migration after contract redeployments.
