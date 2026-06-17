import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "./types";

vi.mock("./supabase", () => ({
  supabaseFetch: vi.fn(),
}));

vi.mock("./auth", () => ({
  requireUser: vi.fn(),
}));

import { supabaseFetch } from "./supabase";
import { requireUser } from "./auth";
import { handleOrders } from "./routes/orders";

const env = {} as Env;

beforeEach(() => {
  vi.mocked(supabaseFetch).mockReset();
  vi.mocked(requireUser).mockReset();
});

describe("POST /v1/orders/link-guest", () => {
  it("links guest orders only for authenticated verified user via RPC", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce({ id: "user-1", email: "guest@example.com" });
    vi.mocked(supabaseFetch).mockResolvedValueOnce(2);

    const req = new Request("https://api.example/v1/orders/link-guest", { method: "POST" });
    const res = await handleOrders(req, env, new URL(req.url));
    const body = (await res!.json()) as { data: { linked: number } };

    expect(body.data.linked).toBe(2);
    expect(supabaseFetch).toHaveBeenCalledWith(
      env,
      "/rest/v1/rpc/link_guest_orders",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ p_user_id: "user-1" }),
      }),
    );
  });

  it("rejects unverified email linking", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce({ id: "user-2", email: "new@example.com" });
    vi.mocked(supabaseFetch).mockRejectedValueOnce(
      new Error("Database error: Email must be verified before linking guest orders"),
    );

    const req = new Request("https://api.example/v1/orders/link-guest", { method: "POST" });
    const res = await handleOrders(req, env, new URL(req.url));
    expect(res!.status).toBe(403);
  });
});
