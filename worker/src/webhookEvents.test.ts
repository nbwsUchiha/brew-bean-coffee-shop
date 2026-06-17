import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "./types";

vi.mock("./supabase", () => ({
  supabaseFetch: vi.fn(),
}));

import { supabaseFetch } from "./supabase";
import {
  claimWebhookEvent,
  completeWebhookEvent,
  failWebhookEvent,
} from "./webhookEvents";

const env = {} as Env;
const fetchMock = vi.mocked(supabaseFetch);

beforeEach(() => {
  fetchMock.mockReset();
});

describe("claimWebhookEvent", () => {
  it("returns duplicate for completed events", async () => {
    fetchMock.mockResolvedValueOnce([{ id: "evt_1", status: "completed" }]);
    const result = await claimWebhookEvent(env, "evt_1", "checkout.session.completed");
    expect(result).toBe("duplicate");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries failed events by setting status to processing", async () => {
    fetchMock
      .mockResolvedValueOnce([{ id: "evt_2", status: "failed" }])
      .mockResolvedValueOnce(null);
    const result = await claimWebhookEvent(env, "evt_2", "checkout.session.completed");
    expect(result).toBe("claimed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1][2] as RequestInit).method).toBe("PATCH");
  });

  it("inserts new events as processing", async () => {
    fetchMock.mockResolvedValueOnce([]).mockResolvedValueOnce(null);
    const result = await claimWebhookEvent(env, "evt_3", "checkout.session.completed");
    expect(result).toBe("claimed");
    expect((fetchMock.mock.calls[1][2] as RequestInit).method).toBe("POST");
  });
});

describe("webhook status updates", () => {
  it("marks event completed", async () => {
    fetchMock.mockResolvedValueOnce(null);
    await completeWebhookEvent(env, "evt_ok");
    expect((fetchMock.mock.calls[0][2] as RequestInit).body).toContain('"status":"completed"');
  });

  it("marks event failed with message", async () => {
    fetchMock.mockResolvedValueOnce(null);
    await failWebhookEvent(env, "evt_bad", "inventory error");
    const body = (fetchMock.mock.calls[0][2] as RequestInit).body as string;
    expect(body).toContain('"status":"failed"');
    expect(body).toContain("inventory error");
  });
});
