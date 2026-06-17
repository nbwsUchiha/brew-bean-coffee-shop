-- Guest order linking and refund inventory restoration
-- Run after 005_webhook_inventory.sql

-- ---------------------------------------------------------------------------
-- Refund / restoration tracking
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists inventory_restored boolean not null default false,
  add column if not exists refund_email_sent_at timestamptz;

-- Restore stock once for refunded paid orders that previously reduced inventory.
create or replace function public.restore_order_inventory(p_order_id uuid)
returns void as $$
declare
  was_reduced boolean;
  already_restored boolean;
begin
  select inventory_reduced, inventory_restored
  into was_reduced, already_restored
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found: %', p_order_id;
  end if;

  if already_restored or not was_reduced then
    return;
  end if;

  update public.products p
  set stock_quantity = p.stock_quantity + oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id
    and oi.product_id = p.id
    and oi.product_id is not null;

  update public.orders
  set inventory_restored = true
  where id = p_order_id;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Link guest orders after verified email signup (one account per order)
-- ---------------------------------------------------------------------------
create or replace function public.link_guest_orders(p_user_id uuid)
returns integer as $$
declare
  user_email text;
  linked_count integer;
begin
  select email into user_email
  from auth.users
  where id = p_user_id
    and email_confirmed_at is not null;

  if user_email is null then
    raise exception 'Email must be verified before linking guest orders';
  end if;

  update public.orders
  set user_id = p_user_id
  where user_id is null
    and lower(trim(customer_email)) = lower(trim(user_email))
    and payment_status in ('paid', 'refunded');

  get diagnostics linked_count = row_count;
  return linked_count;
end;
$$ language plpgsql security definer;

create index if not exists orders_guest_email_idx
  on public.orders (lower(customer_email))
  where user_id is null;
