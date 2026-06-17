import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "./types";
import { priceCart } from "./pricing";

vi.mock("./supabase", () => ({
  supabaseFetch: vi.fn(),
}));

vi.mock("./checkoutOrder", () => ({
  createPendingOrder: vi.fn(),
  attachStripeSessionToOrder: vi.fn(),
  markCheckoutFailed: vi.fn(),
}));

vi.mock("./stripe", () => ({
  createStripeCheckoutSession: vi.fn(),
}));

vi.mock("./routes/products", () => ({
  fetchProductsByIds: vi.fn(),
}));

vi.mock("./rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
  clientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { supabaseFetch } from "./supabase";
import { createPendingOrder, attachStripeSessionToOrder, markCheckoutFailed } from "./checkoutOrder";
import { createStripeCheckoutSession } from "./stripe";
import { fetchProductsByIds } from "./routes/products";
import { handleCheckout } from "./routes/checkout";

const env = {
  TAX_RATE_BPS: "800",
  PICKUP_FEE_CENTS: "0",
  DELIVERY_FEE_CENTS: "499",
  STRIPE_SUCCESS_URL: "https://example.com/success",
  STRIPE_CANCEL_URL: "https://example.com/cart",
} as Env;

const product = {
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
};

beforeEach(() => {
  vi.mocked(createPendingOrder).mockReset();
  vi.mocked(attachStripeSessionToOrder).mockReset();
  vi.mocked(markCheckoutFailed).mockReset();
  vi.mocked(createStripeCheckoutSession).mockReset();
  vi.mocked(fetchProductsByIds).mockReset();
});

describe("handleCheckout session ordering", () => {
  it("creates pending order before stripe session", async () => {
    vi.mocked(fetchProductsByIds).mockResolvedValueOnce([product]);
    vi.mocked(createPendingOrder).mockResolvedValueOnce({
      orderId: "ord_first",
      orderNumber: "BB-001",
    });
    vi.mocked(createStripeCheckoutSession).mockResolvedValueOnce({
      id: "cs_test",
      url: "https://checkout.stripe.com/test",
    });
    vi.mocked(attachStripeSessionToOrder).mockResolvedValueOnce(undefined);

    const req = new Request("https://api.example/v1/checkout/session", {
      method: "POST",
      body: JSON.stringify({
        items: [{ productId: product.id, quantity: 1 }],
        email: "buyer@example.com",
        fulfillmentMethod: "pickup",
      }),
    });

    const res = await handleCheckout(req, env, new URL(req.url));
    const body = (await res!.json()) as { data: { sessionId: string } };

    expect(createPendingOrder).toHaveBeenCalled();
    expect(createStripeCheckoutSession).toHaveBeenCalled();
    expect(vi.mocked(createPendingOrder).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createStripeCheckoutSession).mock.invocationCallOrder[0],
    );
    expect(attachStripeSessionToOrder).toHaveBeenCalledWith(env, "ord_first", "cs_test");
    expect(body.data.sessionId).toBe("cs_test");
  });

  it("marks checkout failed when stripe session creation fails", async () => {
    vi.mocked(fetchProductsByIds).mockResolvedValueOnce([product]);
    vi.mocked(createPendingOrder).mockResolvedValueOnce({
      orderId: "ord_stripe_fail",
      orderNumber: "BB-002",
    });
    vi.mocked(createStripeCheckoutSession).mockRejectedValueOnce(new Error("Stripe down"));
    vi.mocked(markCheckoutFailed).mockResolvedValueOnce(undefined);

    const req = new Request("https://api.example/v1/checkout/session", {
      method: "POST",
      body: JSON.stringify({
        items: [{ productId: product.id, quantity: 1 }],
        email: "fail@example.com",
        fulfillmentMethod: "pickup",
      }),
    });

    await expect(handleCheckout(req, env, new URL(req.url))).rejects.toThrow("Stripe down");
    expect(markCheckoutFailed).toHaveBeenCalledWith(env, "ord_stripe_fail", "Stripe down");
  });
});

describe("concurrent checkout / insufficient stock", () => {
  it("rejects checkout when quantity exceeds stock at quote time", () => {
    expect(() =>
      priceCart(
        env,
        [{ productId: product.id, quantity: 50 }],
        [{ ...product, stock_quantity: 2 }],
        "pickup",
      ),
    ).toThrow(/Insufficient stock/);
  });
});
