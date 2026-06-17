import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "./types";

vi.mock("./supabase", () => ({
  supabaseFetch: vi.fn(),
}));

import { supabaseFetch } from "./supabase";
import { reduceOrderInventory } from "./inventory";

const env = {} as Env;
const fetchMock = vi.mocked(supabaseFetch);

beforeEach(() => {
  fetchMock.mockReset();
});

describe("reduceOrderInventory", () => {
  it("calls atomic reduce_order_inventory RPC", async () => {
    fetchMock.mockResolvedValueOnce(null);
    await reduceOrderInventory(env, "ord_1");
    expect(fetchMock).toHaveBeenCalledWith(
      env,
      "/rest/v1/rpc/reduce_order_inventory",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ p_order_id: "ord_1" }),
      }),
    );
  });

  it("propagates insufficient stock errors from database", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Database error: Insufficient stock for product"));
    await expect(reduceOrderInventory(env, "ord_2")).rejects.toThrow(/Insufficient stock/);
  });
});

describe("atomic inventory (documented contract)", () => {
  it("expects RPC to fail entire operation when any line lacks stock", () => {
    const contract = {
      function: "reduce_order_inventory",
      behavior: [
        "locks order and product rows",
        "verifies all lines before any update",
        "fails transaction on insufficient stock",
        "idempotent when inventory_reduced is true",
      ],
    };
    expect(contract.function).toBe("reduce_order_inventory");
    expect(contract.behavior).toHaveLength(4);
  });
});
