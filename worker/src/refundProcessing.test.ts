import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "./types";

vi.mock("./supabase", () => ({
  supabaseFetch: vi.fn(),
}));

vi.mock("./email", () => ({
  sendRefundEmail: vi.fn(),
}));

vi.mock("./inventory", () => ({
  restoreOrderInventory: vi.fn(),
}));

import { supabaseFetch } from "./supabase";
import { restoreOrderInventory } from "./inventory";
import { processChargeRefunded } from "./webhookProcessing";

const env = {} as Env;
const fetchMock = vi.mocked(supabaseFetch);
const restoreMock = vi.mocked(restoreOrderInventory);

beforeEach(() => {
  fetchMock.mockReset();
  restoreMock.mockReset();
});

describe("processChargeRefunded", () => {
  it("refunds order and restores inventory once", async () => {
    fetchMock
      .mockResolvedValueOnce([{ id: "ord_1", payment_status: "paid", refund_email_sent_at: null }])
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([{ order_number: "BB-1", customer_email: "a@example.com", total_cents: 500 }])
      .mockResolvedValueOnce(null);
    restoreMock.mockResolvedValueOnce(undefined);

    const result = await processChargeRefunded(env, { payment_intent: "pi_1" });
    expect(result).toEqual({ ok: true });
    expect(restoreMock).toHaveBeenCalledWith(env, "ord_1");
  });

  it("is idempotent on duplicate refund events", async () => {
    fetchMock
      .mockResolvedValueOnce([
        { id: "ord_2", payment_status: "refunded", refund_email_sent_at: "2024-01-01" },
      ])
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([{ id: "hist" }]);
    restoreMock.mockResolvedValueOnce(undefined);

    const result = await processChargeRefunded(env, { payment_intent: "pi_2" });
    expect(result).toEqual({ ok: true });
    expect(restoreMock).toHaveBeenCalledWith(env, "ord_2");
  });
});
