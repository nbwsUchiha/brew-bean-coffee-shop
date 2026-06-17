import { describe, it, expect } from "vitest";
import { priceCart, effectivePriceCents } from "../src/pricing";
import type { Env, Product } from "../src/types";
import { verifyStripeWebhook, signStripeWebhook } from "../src/stripe";
import { cartLineSchema, checkoutSchema } from "../src/validation";

const env = {
  TAX_RATE_BPS: "800",
  PICKUP_FEE_CENTS: "0",
  DELIVERY_FEE_CENTS: "499",
} as Env;

const product = (overrides: Partial<Product> = {}): Product => ({
  id: "11111111-1111-1111-1111-111111111111",
  name: "House Latte",
  slug: "house-latte",
  description: null,
  short_description: null,
  category_id: null,
  price_cents: 550,
  sale_price_cents: null,
  image_url: null,
  stock_quantity: 10,
  available: true,
  featured: false,
  origin: null,
  roast_level: null,
  size_weight: null,
  created_at: "",
  updated_at: "",
  ...overrides,
});

describe("pricing", () => {
  it("uses sale price when lower", () => {
    expect(effectivePriceCents(product({ price_cents: 600, sale_price_cents: 500 }))).toBe(500);
  });

  it("calculates cart totals with tax", () => {
    const totals = priceCart(
      env,
      [{ productId: product().id, quantity: 2 }],
      [product()],
      "pickup",
    );
    expect(totals.subtotalCents).toBe(1100);
    expect(totals.taxCents).toBe(88);
    expect(totals.totalCents).toBe(1188);
  });

  it("rejects quantity above stock", () => {
    expect(() =>
      priceCart(env, [{ productId: product().id, quantity: 99 }], [product({ stock_quantity: 2 })], "pickup"),
    ).toThrow(/stock/i);
  });
});

describe("validation", () => {
  it("validates checkout payload", () => {
    const parsed = checkoutSchema.parse({
      items: [{ productId: "11111111-1111-1111-1111-111111111111", quantity: 1 }],
      email: "test@example.com",
      fulfillmentMethod: "pickup",
    });
    expect(parsed.email).toBe("test@example.com");
  });

  it("rejects invalid cart line", () => {
    expect(() => cartLineSchema.parse({ productId: "bad", quantity: 0 })).toThrow();
  });
});

describe("stripe webhook", () => {
  it("rejects missing signature", async () => {
    const ok = await verifyStripeWebhook("{}", null, "whsec_test");
    expect(ok).toBe(false);
  });

  it("accepts a correctly signed payload", async () => {
    const secret = "whsec_test_signing_key";
    const payload = '{"id":"evt_test","type":"checkout.session.completed"}';
    const header = await signStripeWebhook(payload, secret);
    const ok = await verifyStripeWebhook(payload, header, secret);
    expect(ok).toBe(true);
  });
});
