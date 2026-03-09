-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 创建 swap_events 表
create table if not exists swap_events (
  id bigserial primary key,
  tx_hash text unique not null,
  block_number bigint not null,
  timestamp timestamptz not null,
  eth_to_sztu boolean not null,
  amount_in numeric not null,
  amount_out numeric not null,
  price numeric not null,
  eth_reserve numeric not null,
  sztu_reserve numeric not null,
  created_at timestamptz default now()
);

-- 2. 创建索引
create index if not exists idx_swap_events_timestamp on swap_events (timestamp);

-- 3. 创建 OHLC 视图（K 线数据）
create or replace view price_ohlc as
select
  date_trunc('hour', timestamp) as time,
  (array_agg(price order by timestamp asc))[1] as open,
  max(price) as high,
  min(price) as low,
  (array_agg(price order by timestamp desc))[1] as close,
  sum(amount_in) as volume,
  count(*) as trade_count
from swap_events
group by date_trunc('hour', timestamp)
order by time;

-- 4. 开启 RLS 并允许匿名读取
alter table swap_events enable row level security;
create policy "Anyone can read swap_events" on swap_events
  for select using (true);

-- 5. 开启 Realtime（前端实时订阅需要）
alter publication supabase_realtime add table swap_events;
