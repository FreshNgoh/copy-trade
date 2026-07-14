alter table public.portfolio
  add column if not exists master_status text not null default 'NONE',
  add column if not exists is_verified_master boolean not null default false,
  add column if not exists master_verified_at timestamp with time zone,
  add column if not exists master_verification_tx_hash text,
  add column if not exists master_verification_block numeric,
  add column if not exists master_verification_error text,
  add column if not exists master_total_trades numeric,
  add column if not exists master_roi numeric,
  add column if not exists master_trading_volume numeric;

create index if not exists portfolio_master_status_idx
  on public.portfolio (master_status);

create index if not exists portfolio_verified_master_idx
  on public.portfolio (is_verified_master)
  where is_verified_master = true;
