import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "./types";

vi.mock("./supabase", () => ({
  supabaseFetch: vi.fn(),
}));

import { supabaseFetch } from "./supabase";
import {
  createPendingOrder,
  attachStripeSessionToOrder,
  markCheckoutFailed,
} from "./checkoutOrder";

const env = {} as Env;
const fetchMock = vi.mocked(supabaseFetch);

const totals = {
  lines: [
    {
      productId: "11111111-1111-1111-1111-111111111111",
      name: "Latte",
      slug: "latte",
      quantity: 1,
      unitPriceCents: 550,
      lineTotalCents: 550,
    },
  ],
  subtotalCents: 550,
  taxCents: 44,
  shippingCents: 0,
  totalCents: 594,
};

beforeEach(() => {
  fetchMock.mockReset();
});

describe("createPendingOrder", () => {
  it("creates order before stripe session exists", async () => {
    fetchMock
      .mockResolvedValueOnce("BB-260616-00001")
      .mockResolvedValueOnce([{ id: "ord_new" }])
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await createPendingOrder(
      env,
      totals,
      { email: "test@example.com", fulfillmentMethod: "pickup" },
      null,
    );

    expect(result.orderId).toBe("ord_new");
    const orderInit = fetchMock.mock.calls[1][2] as RequestInit;
    const orderBody = orderInit.body as string;
    expect(orderBody).toContain('"stripe_session_id":null');
  });

  it("throws when database order creation fails", async () => {
    fetchMock.mockResolvedValueOnce("BB-260616-00002").mockResolvedValueOnce([]);
    await expect(
      createPendingOrder(env, totals, { email: "fail@example.com", fulfillmentMethod: "pickup" }, null),
    ).rejects.toThrow(/Failed to create order/);
  });
});

describe("attachStripeSessionToOrder", () => {
  it("updates order and payment with session id", async () => {
    fetchMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await attachStripeSessionToOrder(env, "ord_1", "cs_123");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[0][2] as RequestInit).body).toContain("cs_123");
  });
});

describe("markCheckoutFailed", () => {
  it("marks order checkout_failed after stripe session failure", async () => {
    fetchMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await markCheckoutFailed(env, "ord_fail", "Payment provider error");
    const orderPatch = (fetchMock.mock.calls[0][2] as RequestInit).body as string;
    expect(orderPatch).toContain("checkout_failed");
  });
});

describe("checkout session failure flow", () => {
  it("simulates stripe failure after order creation", async () => {
    fetchMock
      .mockResolvedValueOnce("BB-260616-00003")
      .mockResolvedValueOnce([{ id: "ord_pending" }])
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const pending = await createPendingOrder(
      env,
      totals,
      { email: "stripe-fail@example.com", fulfillmentMethod: "pickup" },
      null,
    );

    fetchMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await markCheckoutFailed(env, pending.orderId, "Stripe API unavailable");

    expect(pending.orderId).toBe("ord_pending");
    const bodies = fetchMock.mock.calls.map((c) => String((c[2] as RequestInit)?.body ?? ""));
    expect(bodies.some((b) => b.includes("checkout_failed"))).toBe(true);
  });
});
