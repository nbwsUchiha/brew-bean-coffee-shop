-- Track when payment completed (for emails + stats)
alter table public.orders
  add column if not exists paid_at timestamptz;
