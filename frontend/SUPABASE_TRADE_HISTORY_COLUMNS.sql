alter table positions
  add column if not exists on_chain_synced boolean not null default false,
  add column if not exists on_chain_syncing boolean not null default false,
  add column if not exists on_chain_trade_id text,
  add column if not exists on_chain_tx_hash text,
  add column if not exists on_chain_synced_at timestamptz,
  add column if not exists on_chain_sync_error text;

create unique index if not exists positions_on_chain_trade_id_unique
  on positions (on_chain_trade_id)
  where on_chain_trade_id is not null;
