-- Run after SUPABASE_TRADE_HISTORY_COLUMNS.sql.
-- Consolidates existing duplicate copied positions into one cross-margin row.
with ranked as (
  select
    position_id,
    trader_wallet_address,
    copied_from_master,
    symbol,
    direction,
    row_number() over (
      partition by lower(trader_wallet_address), lower(copied_from_master), symbol, direction
      order by created_at, position_id
    ) as row_number,
    sum(quantity) over (
      partition by lower(trader_wallet_address), lower(copied_from_master), symbol, direction
    ) as total_quantity,
    sum(quantity * entry_price) over (
      partition by lower(trader_wallet_address), lower(copied_from_master), symbol, direction
    ) as total_notional,
    first_value(leverage) over (
      partition by lower(trader_wallet_address), lower(copied_from_master), symbol, direction
      order by created_at desc, position_id desc
    ) as latest_leverage
  from positions
  where status = 'OPEN'
    and trade_source = 'COPY'
), ids as (
  select
    lower(trader_wallet_address) as trader_wallet_address,
    lower(copied_from_master) as copied_from_master,
    symbol,
    direction,
    array_agg(distinct copy_trade_position_id)
      filter (where copy_trade_position_id is not null) as position_ids
  from positions
  where status = 'OPEN'
    and trade_source = 'COPY'
  group by lower(trader_wallet_address), lower(copied_from_master), symbol, direction
)
update positions as position
set
  quantity = ranked.total_quantity,
  entry_price = ranked.total_notional / nullif(ranked.total_quantity, 0),
  leverage = ranked.latest_leverage,
  copy_trade_position_ids = coalesce(ids.position_ids, '{}'),
  updated_at = now()
from ranked
join ids
  on ids.trader_wallet_address = lower(ranked.trader_wallet_address)
  and ids.copied_from_master = lower(ranked.copied_from_master)
  and ids.symbol = ranked.symbol
  and ids.direction = ranked.direction
where position.position_id = ranked.position_id
  and ranked.row_number = 1;

with ranked as (
  select
    position_id,
    row_number() over (
      partition by lower(trader_wallet_address), lower(copied_from_master), symbol, direction
      order by created_at, position_id
    ) as row_number
  from positions
  where status = 'OPEN'
    and trade_source = 'COPY'
)
delete from positions
using ranked
where positions.position_id = ranked.position_id
  and ranked.row_number > 1;
