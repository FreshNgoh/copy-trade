# KopiTrade

KopiTrade is a Next.js copy-trading dashboard with wallet connectivity, Supabase-backed data, and optional Sepolia smart-contract integrations.

## Quick start

### Prerequisites

- Node.js 18.17 or newer
- npm (included with Node.js)

### Run the app

From the repository root:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The development server listens on `0.0.0.0`, so another device on the same network can open it at `http://<your-computer-ip>:3000`. Make sure your firewall permits incoming connections to port 3000.

## Environment configuration

Edit `frontend/.env.local` after copying the example file. At minimum, configure these values for Supabase-backed pages and API routes:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_`, commit `.env.local`, or expose it in browser code.

Other variables in `.env.example` enable wallet connection, Sepolia RPC access, and deployed contract features. The interface can start without all contract addresses, but their related features will remain unavailable until configured.

To prepare a Supabase project, run the tracked `frontend/SUPABASE_*.sql` migrations in the Supabase SQL Editor. Apply the base table migration before migrations that alter or merge table data.

## Useful commands

Run these inside `frontend`:

```bash
npm run dev      # development server on port 3000
npm run build    # production build
npm run serve    # serve the production build on port 3000
```

For a production-style local run:

```bash
npm run build
npm run serve
```

## Backend contract utilities

The `backend` directory contains TypeScript blockchain services and Solidity contract tooling; it is not a separate HTTP server required to open the web app.

To type-check those utilities:

```bash
cd backend
npm install
npm run typecheck
```

See `backend/contracts/README.md` and `backend/TRADE_HISTORY_INTEGRATION.md` for contract-specific setup.

## Troubleshooting

- If port 3000 is already in use, stop the other process before starting KopiTrade.
- If a page reports missing Supabase variables, confirm `frontend/.env.local` contains both Supabase values and restart the dev server.
- If wallet connection is unavailable, set `NEXT_PUBLIC_WC_PROJECT_ID` to a WalletConnect Cloud project ID.
- A production build needs internet access the first time Next.js downloads the Google fonts used by the application.
