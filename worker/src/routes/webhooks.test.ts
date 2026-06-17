import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "../types";

vi.mock("../supabase", () => ({
  supabaseFetch: vi.fn(),
}));

vi.mock("../stripe", () => ({
  verifyStripeWebhook: vi.fn(),
  parseStripeEvent: vi.fn(),
}));

vi.mock("../webhookEvents", () => ({
  claimWebhookEvent: vi.fn(),
  completeWebhookEvent: vi.fn(),
  failWebhookEvent: vi.fn(),
}));

vi.mock("../webhookProcessing", () => ({
  processCheckoutSessionCompleted: vi.fn(),
}));

import { verifyStripeWebhook, parseStripeEvent } from "../stripe";
import { claimWebhookEvent, completeWebhookEvent, failWebhookEvent } from "../webhookEvents";
import { processCheckoutSessionCompleted } from "../webhookProcessing";
import { handleStripeWebhook } from "./webhooks";

const env = { STRIPE_WEBHOOK_SECRET: "whsec_test" } as Env;

beforeEach(() => {
  vi.mocked(verifyStripeWebhook).mockReset();
  vi.mocked(parseStripeEvent).mockReset();
  vi.mocked(claimWebhookEvent).mockReset();
  vi.mocked(completeWebhookEvent).mockReset();
  vi.mocked(failWebhookEvent).mockReset();
  vi.mocked(processCheckoutSessionCompleted).mockReset();
});

describe("handleStripeWebhook", () => {
  const makeRequest = () =>
    new Request("https://api.example/v1/webhooks/stripe", {
      method: "POST",
      body: "{}",
      headers: { "Stripe-Signature": "t=1,v1=abc" },
    });

  it("returns duplicate for completed events without reprocessing", async () => {
    vi.mocked(verifyStripeWebhook).mockResolvedValueOnce(true);
    vi.mocked(parseStripeEvent).mockReturnValueOnce({
      id: "evt_dup",
      type: "checkout.session.completed",
    });
    vi.mocked(claimWebhookEvent).mockResolvedValueOnce("duplicate");

    const res = await handleStripeWebhook(makeRequest(), env, new URL(makeRequest().url));
    const body = (await res!.json()) as { duplicate: boolean };
    expect(body.duplicate).toBe(true);
    expect(processCheckoutSessionCompleted).not.toHaveBeenCalled();
  });

  it("returns 500 on processing failure so stripe can retry", async () => {
    vi.mocked(verifyStripeWebhook).mockResolvedValueOnce(true);
    vi.mocked(parseStripeEvent).mockReturnValueOnce({
      id: "evt_fail",
      type: "checkout.session.completed",
      data: { object: { id: "cs_1" } },
    });
    vi.mocked(claimWebhookEvent).mockResolvedValueOnce("claimed");
    vi.mocked(processCheckoutSessionCompleted).mockResolvedValueOnce({
      ok: false,
      message: "inventory error",
    });
    vi.mocked(failWebhookEvent).mockResolvedValueOnce(undefined);

    const res = await handleStripeWebhook(makeRequest(), env, new URL(makeRequest().url));
    expect(res!.status).toBe(500);
    expect(failWebhookEvent).toHaveBeenCalledWith(env, "evt_fail", "inventory error");
    expect(completeWebhookEvent).not.toHaveBeenCalled();
  });

  it("completes event after successful retry", async () => {
    vi.mocked(verifyStripeWebhook).mockResolvedValueOnce(true);
    vi.mocked(parseStripeEvent).mockReturnValueOnce({
      id: "evt_retry",
      type: "checkout.session.completed",
      data: { object: { id: "cs_2" } },
    });
    vi.mocked(claimWebhookEvent).mockResolvedValueOnce("claimed");
    vi.mocked(processCheckoutSessionCompleted).mockResolvedValueOnce({ ok: true });
    vi.mocked(completeWebhookEvent).mockResolvedValueOnce(undefined);

    const res = await handleStripeWebhook(makeRequest(), env, new URL(makeRequest().url));
    expect(res!.status).toBe(200);
    expect(completeWebhookEvent).toHaveBeenCalledWith(env, "evt_retry");
  });
});
