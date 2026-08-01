create table if not exists public.copy_trading_followers (
  id uuid primary key default gen_random_uuid(),
  master_wallet_address text not null,
  follower_wallet_address text not null,
  max_copy_amount numeric not null default 0,
  max_allocation_bps integer not null default 0,
  stop_loss_bps integer not null default 0,
  max_daily_trades integer not null default 0,
  enabled boolean not null default true,
  settings_tx_hash text,
  paused_tx_hash text,
  last_copy_status text,
  last_copy_error text,
  last_copy_tx_hash text,
  last_copy_position_id text,
  last_copied_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint copy_trading_followers_unique
    unique (master_wallet_address, follower_wallet_address)
);

create index if not exists copy_trading_followers_master_idx
  on public.copy_trading_followers (master_wallet_address);

create index if not exists copy_trading_followers_follower_idx
  on public.copy_trading_followers (follower_wallet_address);

create index if not exists copy_trading_followers_enabled_master_idx
  on public.copy_trading_followers (master_wallet_address)
  where enabled = true;
