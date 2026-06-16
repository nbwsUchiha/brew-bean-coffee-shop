export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_SUCCESS_URL: string;
  STRIPE_CANCEL_URL: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  STORE_NAME?: string;
  ALLOWED_ORIGINS?: string;
  ADMIN_SETUP_SECRET?: string;
  TAX_RATE_BPS?: string;
  PICKUP_FEE_CENTS?: string;
  DELIVERY_FEE_CENTS?: string;
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
  created_at: string;
  updated_at: string;
  categories?: { name: string; slug: string } | null;
  product_images?: Array<{ id: string; url: string; sort_order: number }>;
};

export type CartLine = { productId: string; quantity: number };

export type PricedLine = {
  productId: string;
  name: string;
  slug: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type CartTotals = {
  lines: PricedLine[];
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
};

export type AuthUser = { id: string; email: string | null };
