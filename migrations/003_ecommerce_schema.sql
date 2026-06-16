-- Full ecommerce schema for Brew & Bean Coffee
-- Run after 001_schema.sql and 002_order_paid_at.sql

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Products (migrate from catalog_items when present)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  short_description text,
  category_id uuid references public.categories(id) on delete set null,
  price_cents integer not null check (price_cents >= 0),
  sale_price_cents integer check (sale_price_cents is null or (sale_price_cents >= 0 and sale_price_cents <= price_cents)),
  image_url text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  available boolean not null default true,
  featured boolean not null default false,
  origin text,
  roast_level text,
  size_weight text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_available_idx on public.products(available) where available = true;
create index if not exists products_featured_idx on public.products(featured) where featured = true;
create index if not exists products_slug_idx on public.products(slug);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_id_idx on public.product_images(product_id);

-- Migrate catalog_items → products (preserve IDs for existing orders)
insert into public.products (
  id, name, slug, description, short_description, price_cents, available, stock_quantity
)
select
  c.id,
  c.name,
  lower(regexp_replace(trim(c.name), '[^a-zA-Z0-9]+', '-', 'g')),
  c.description,
  left(coalesce(c.description, ''), 120),
  c.price_cents,
  c.active,
  50
from public.catalog_items c
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Customer addresses
-- ---------------------------------------------------------------------------
create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_addresses_user_id_idx on public.customer_addresses(user_id);

create trigger customer_addresses_updated_at
  before update on public.customer_addresses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Orders (extend existing table)
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists order_number text,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists customer_name text,
  add column if not exists subtotal_cents integer,
  add column if not exists tax_cents integer not null default 0,
  add column if not exists shipping_cents integer not null default 0,
  add column if not exists total_cents integer,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists order_status text not null default 'pending',
  add column if not exists stripe_payment_intent_id text,
  add column if not exists fulfillment_method text not null default 'pickup' check (fulfillment_method in ('pickup', 'delivery')),
  add column if not exists updated_at timestamptz not null default now();

-- Backfill totals from legacy amount_cents
update public.orders
set
  subtotal_cents = coalesce(subtotal_cents, amount_cents),
  total_cents = coalesce(total_cents, amount_cents),
  payment_status = case when status = 'paid' then 'paid' else 'pending' end,
  order_status = case when status = 'paid' then 'paid' else 'pending' end
where subtotal_cents is null or total_cents is null;

create unique index if not exists orders_order_number_idx on public.orders(order_number) where order_number is not null;
create unique index if not exists orders_stripe_session_id_idx on public.orders(stripe_session_id) where stripe_session_id is not null;
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_order_status_idx on public.orders(order_status);

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Order items
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_slug text,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- Backfill single-item orders from legacy item_id
insert into public.order_items (order_id, product_id, product_name, quantity, unit_price_cents, line_total_cents)
select
  o.id,
  o.item_id,
  coalesce(p.name, ci.name, 'Coffee item'),
  1,
  o.amount_cents,
  o.amount_cents
from public.orders o
left join public.products p on p.id = o.item_id
left join public.catalog_items ci on ci.id = o.item_id
where o.item_id is not null
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  stripe_session_id text,
  stripe_payment_intent_id text,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_order_id_idx on public.payments(order_id);
create unique index if not exists payments_stripe_session_id_idx on public.payments(stripe_session_id) where stripe_session_id is not null;

create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Order status history
-- ---------------------------------------------------------------------------
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists order_status_history_order_id_idx on public.order_status_history(order_id);

-- ---------------------------------------------------------------------------
-- Stripe webhook idempotency
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Contact submissions
-- ---------------------------------------------------------------------------
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists contact_submissions_created_at_idx on public.contact_submissions(created_at desc);

-- ---------------------------------------------------------------------------
-- Rate limiting (Worker writes via service role)
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Order number generator
-- ---------------------------------------------------------------------------
create or replace function public.generate_order_number()
returns text as $$
declare
  seq bigint;
begin
  select count(*) + 1 into seq from public.orders;
  return 'BB-' || to_char(now(), 'YYMMDD') || '-' || lpad(seq::text, 5, '0');
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.profiles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_status_history enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.rate_limits enable row level security;

-- Public read: active products & categories
drop policy if exists "Public read catalog_items" on public.catalog_items;

create policy "Public read categories" on public.categories
  for select using (true);

create policy "Public read available products" on public.products
  for select using (available = true);

create policy "Public read product images" on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.available = true
    )
  );

-- Profiles: own row only
create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- Addresses: own rows
create policy "Users manage own addresses" on public.customer_addresses
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Orders: users see own orders (service role creates/updates paid orders)
drop policy if exists "Public read catalog_items" on public.catalog_items;

create policy "Users read own orders" on public.orders
  for select using (auth.uid() = user_id);

create policy "Users read own order items" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

create policy "Users read own payments" on public.payments
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

create policy "Users read own order history" on public.order_status_history
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- Admins read all via service role only (no client admin policies on sensitive tables)
