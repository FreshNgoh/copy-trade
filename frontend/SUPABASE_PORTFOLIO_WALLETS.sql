alter table public.portfolio
  add column if not exists copy_wallet_balance numeric not null default 0;
