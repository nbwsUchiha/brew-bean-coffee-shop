-- Seed data for Brew & Bean Coffee (run after 003_ecommerce_schema.sql)

-- Categories
insert into public.categories (name, slug, description) values
  ('Espresso Drinks', 'espresso-drinks', 'Classic espresso-based beverages.'),
  ('Cold Coffee', 'cold-coffee', 'Iced and cold-brew options.'),
  ('Specialty', 'specialty', 'Matcha and seasonal favorites.')
on conflict (slug) do nothing;

-- Products (upsert by slug)
insert into public.products (
  name, slug, description, short_description, category_id,
  price_cents, sale_price_cents, image_url, stock_quantity, available, featured,
  origin, roast_level, size_weight
)
select
  v.name, v.slug, v.description, v.short_description, c.id,
  v.price_cents, v.sale_price_cents, v.image_url, v.stock_quantity, true, v.featured,
  v.origin, v.roast_level, v.size_weight
from (values
  (
    'House Latte', 'house-latte',
    'Espresso with steamed milk and a light layer of foam. Our signature morning drink.',
    'Espresso with steamed milk.',
    'espresso-drinks', 550, null::integer, '/drinks/house-latte.svg', 100, true,
    'Colombia', 'Medium', '12 oz'
  ),
  (
    'Cold Brew', 'cold-brew',
    'Slow-steeped for 18 hours. Smooth, bold, and naturally sweet with low acidity.',
    'Slow-steeped, smooth and bold.',
    'cold-coffee', 475, null::integer, '/drinks/cold-brew.svg', 80, true,
    'Ethiopia', 'Dark', '16 oz'
  ),
  (
    'Matcha Oat Latte', 'matcha-oat-latte',
    'Ceremonial grade matcha whisked with creamy oat milk. Earthy, vibrant, and dairy-free.',
    'Ceremonial matcha with oat milk.',
    'specialty', 625, 575, '/drinks/matcha-oat-latte.svg', 60, true,
    'Japan', 'N/A', '12 oz'
  ),
  (
    'Cappuccino', 'cappuccino',
    'Equal parts espresso, steamed milk, and velvety foam. Rich and balanced.',
    'Classic espresso, milk, and foam.',
    'espresso-drinks', 525, null::integer, '/drinks/cappuccino.svg', 90, false,
    'Brazil', 'Medium', '8 oz'
  ),
  (
    'Iced Americano', 'iced-americano',
    'Double shot of espresso over ice, topped with cold water. Clean and refreshing.',
    'Espresso over ice with cold water.',
    'cold-coffee', 425, null::integer, '/drinks/iced-americano.svg', 70, false,
    'Guatemala', 'Medium-Dark', '16 oz'
  ),
  (
    'Vanilla Oat Latte', 'vanilla-oat-latte',
    'House espresso with oat milk and real vanilla syrup. Comfort in a cup.',
    'Espresso, oat milk, and vanilla.',
    'specialty', 595, null::integer, '/drinks/vanilla-oat-latte.svg', 55, false,
    'Colombia', 'Medium', '12 oz'
  )
) as v(name, slug, description, short_description, category_slug, price_cents, sale_price_cents, image_url, stock_quantity, featured, origin, roast_level, size_weight)
join public.categories c on c.slug = v.category_slug
on conflict (slug) do update set
  description = excluded.description,
  short_description = excluded.short_description,
  price_cents = excluded.price_cents,
  sale_price_cents = excluded.sale_price_cents,
  image_url = excluded.image_url,
  stock_quantity = excluded.stock_quantity,
  featured = excluded.featured,
  origin = excluded.origin,
  roast_level = excluded.roast_level,
  size_weight = excluded.size_weight,
  updated_at = now();
