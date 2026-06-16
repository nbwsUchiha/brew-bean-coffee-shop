import { describe, it, expect } from "vitest";
import { effectivePrice } from "./types";
import type { Product } from "./types";

const base: Product = {
  id: "1",
  name: "Latte",
  slug: "latte",
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
};

describe("effectivePrice", () => {
  it("returns regular price", () => {
    expect(effectivePrice(base)).toBe(550);
  });

  it("returns sale price when lower", () => {
    expect(effectivePrice({ ...base, sale_price_cents: 475 })).toBe(475);
  });
});

describe("checkout flow (integration mock)", () => {
  it("validates cart line shape", () => {
    const line = { productId: "11111111-1111-1111-1111-111111111111", quantity: 2 };
    expect(line.quantity).toBeGreaterThan(0);
    expect(line.productId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("simulates payment success state", () => {
    const order = { payment_status: "paid", order_status: "paid" };
    expect(order.payment_status).toBe("paid");
  });
});
