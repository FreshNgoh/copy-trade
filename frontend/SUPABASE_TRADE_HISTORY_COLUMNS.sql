alter table positions
  add column if not exists on_chain_synced boolean not null default false,
  add column if not exists on_chain_syncing boolean not null default false,
  add column if not exists on_chain_trade_id text,
  add column if not exists on_chain_tx_hash text,
  add column if not exists on_chain_synced_at timestamptz,
  add column if not exists on_chain_sync_error text,
  add column if not exists trade_source text not null default 'OWN',
  add column if not exists copied_from_master text,
  add column if not exists copy_trade_position_id text,
  add column if not exists gross_pnl numeric,
  add column if not exists master_reward numeric,
  add column if not exists follower_reward numeric,
  add column if not exists rewards_settled boolean not null default false,
  add column if not exists reward_settled_at timestamptz;

create unique index if not exists positions_on_chain_trade_id_unique
  on positions (on_chain_trade_id)
  where on_chain_trade_id is not null;
