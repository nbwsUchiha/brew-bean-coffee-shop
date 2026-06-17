-- Webhook processing status, atomic inventory reduction, checkout failure support
-- Run after 003_ecommerce_schema.sql and seed.sql

-- ---------------------------------------------------------------------------
-- Stripe webhook event processing status
-- ---------------------------------------------------------------------------
alter table public.stripe_webhook_events
  add column if not exists status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  add column if not exists error_message text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists stripe_webhook_events_status_idx
  on public.stripe_webhook_events(status);

create trigger stripe_webhook_events_updated_at
  before update on public.stripe_webhook_events
  for each row execute function public.set_updated_at();

-- Backfill legacy rows as completed (they were inserted before processing finished)
update public.stripe_webhook_events
set status = 'completed'
where status = 'processing';

-- ---------------------------------------------------------------------------
-- Order fulfillment tracking (idempotent webhook steps)
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists inventory_reduced boolean not null default false,
  add column if not exists confirmation_email_sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- Safer order number generation (advisory lock per day)
-- ---------------------------------------------------------------------------
create or replace function public.generate_order_number()
returns text as $$
declare
  seq bigint;
  lock_key bigint;
begin
  lock_key := ('x' || to_char(now(), 'YYMMDD'))::bit(32)::bigint;
  perform pg_advisory_xact_lock(lock_key);
  select count(*) + 1 into seq
  from public.orders
  where created_at >= date_trunc('day', now() at time zone 'utc');
  return 'BB-' || to_char(now(), 'YYMMDD') || '-' || lpad(seq::text, 5, '0');
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Atomic multi-product inventory reduction for a paid order
-- Locks each product row, verifies stock, reduces atomically.
-- Idempotent: no-op when inventory_reduced is already true.
-- Fails the entire transaction if any line has insufficient stock.
-- ---------------------------------------------------------------------------
create or replace function public.reduce_order_inventory(p_order_id uuid)
returns void as $$
declare
  item record;
  current_stock integer;
  already_reduced boolean;
begin
  select inventory_reduced into already_reduced
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found: %', p_order_id;
  end if;

  if already_reduced then
    return;
  end if;

  for item in
    select oi.product_id, oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.product_id is not null
    order by oi.product_id
  loop
    select stock_quantity into current_stock
    from public.products
    where id = item.product_id
    for update;

    if not found then
      raise exception 'Product not found: %', item.product_id;
    end if;

    if current_stock < item.quantity then
      raise exception 'Insufficient stock for product % (need %, have %)',
        item.product_id, item.quantity, current_stock;
    end if;
  end loop;

  update public.products p
  set stock_quantity = p.stock_quantity - oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id
    and oi.product_id = p.id
    and oi.product_id is not null;

  update public.orders
  set inventory_reduced = true
  where id = p_order_id;
end;
$$ language plpgsql;
