import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "./types";

vi.mock("./supabase", () => ({
  supabaseFetch: vi.fn(),
}));

vi.mock("./routes/orders", () => ({
  fetchOrderBySession: vi.fn(),
}));

vi.mock("./email", () => ({
  sendOrderConfirmationEmail: vi.fn(),
  sendRefundEmail: vi.fn(),
}));

vi.mock("./inventory", () => ({
  reduceOrderInventory: vi.fn(),
  restoreOrderInventory: vi.fn(),
}));

import { supabaseFetch } from "./supabase";
import { fetchOrderBySession } from "./routes/orders";
import { sendOrderConfirmationEmail } from "./email";
import { reduceOrderInventory } from "./inventory";
import { processCheckoutSessionCompleted } from "./webhookProcessing";

const env = {} as Env;
const fetchMock = vi.mocked(supabaseFetch);
const orderMock = vi.mocked(fetchOrderBySession);
const emailMock = vi.mocked(sendOrderConfirmationEmail);
const inventoryMock = vi.mocked(reduceOrderInventory);

beforeEach(() => {
  fetchMock.mockReset();
  orderMock.mockReset();
  emailMock.mockReset();
  inventoryMock.mockReset();
});

describe("processCheckoutSessionCompleted", () => {
  const session = { id: "cs_test", payment_intent: "pi_test" };

  it("completes all steps on first delivery", async () => {
    fetchMock
      .mockResolvedValueOnce([{ id: "ord_1", payment_status: "paid" }])
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(null);
    orderMock.mockResolvedValueOnce({
      order_number: "BB-001",
      customer_email: "buyer@example.com",
      total_cents: 1000,
      order_status: "paid",
      fulfillment_method: "pickup",
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
    inventoryMock.mockResolvedValueOnce(undefined);
    emailMock.mockResolvedValueOnce(undefined);

    const result = await processCheckoutSessionCompleted(env, session);
    expect(result).toEqual({ ok: true });
    expect(inventoryMock).toHaveBeenCalledWith(env, "ord_1");
    expect(emailMock).toHaveBeenCalled();
  });

  it("fails when order is missing", async () => {
    fetchMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const result = await processCheckoutSessionCompleted(env, session);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/not found/i);
  });

  it("retries successfully when order already paid (idempotent)", async () => {
    fetchMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "ord_2", payment_status: "paid", confirmation_email_sent_at: null }])
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([{ id: "hist_1" }]);
    inventoryMock.mockResolvedValueOnce(undefined);
    orderMock.mockResolvedValueOnce({
      order_number: "BB-002",
      customer_email: "retry@example.com",
      total_cents: 500,
      order_status: "paid",
      fulfillment_method: "pickup",
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
    emailMock.mockResolvedValueOnce(undefined);
    fetchMock.mockResolvedValueOnce(null);

    const result = await processCheckoutSessionCompleted(env, session);
    expect(result).toEqual({ ok: true });
    expect(inventoryMock).toHaveBeenCalledWith(env, "ord_2");
  });

  it("skips duplicate paid status history on retry", async () => {
    fetchMock
      .mockResolvedValueOnce([{ id: "ord_3", payment_status: "paid", confirmation_email_sent_at: "2024-01-01" }])
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([{ id: "hist_existing" }]);
    inventoryMock.mockResolvedValueOnce(undefined);
    orderMock.mockResolvedValueOnce({
      order_number: "BB-003",
      customer_email: "done@example.com",
      total_cents: 500,
      order_status: "paid",
      fulfillment_method: "pickup",
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    const result = await processCheckoutSessionCompleted(env, session);
    expect(result).toEqual({ ok: true });
    expect(emailMock).not.toHaveBeenCalled();
  });
});
