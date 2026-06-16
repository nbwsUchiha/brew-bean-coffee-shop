export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  category_id: string | null;
  price_cents: number;
  sale_price_cents: number | null;
  image_url: string | null;
  stock_quantity: number;
  available: boolean;
  featured: boolean;
  origin: string | null;
  roast_level: string | null;
  size_weight: string | null;
  categories?: { name: string; slug: string } | null;
  product_images?: Array<{ id: string; url: string; sort_order: number }>;
};

export type CartLine = { productId: string; quantity: number; name?: string; imageUrl?: string | null };

export type CartTotals = {
  lines: Array<{
    productId: string;
    name: string;
    slug: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
};

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  avatar_url: string | null;
  role: "customer" | "admin";
};

export type Order = {
  id: string;
  order_number: string | null;
  customer_email: string | null;
  customer_name: string | null;
  subtotal_cents: number | null;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number | null;
  amount_cents: number;
  payment_status: string;
  order_status: string;
  status: string;
  fulfillment_method: string;
  created_at: string;
  paid_at: string | null;
  order_items?: Array<{
    id: string;
    product_name: string;
    product_slug: string | null;
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
  }>;
  order_status_history?: Array<{ status: string; note: string | null; created_at: string }>;
};

export type SiteStats = {
  menuCount: number;
  ordersFulfilled: number;
  lastOrderAt: string | null;
  pickupMinutes: number;
};

export function effectivePrice(product: Product): number {
  if (product.sale_price_cents != null && product.sale_price_cents < product.price_cents) {
    return product.sale_price_cents;
  }
  return product.price_cents;
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
