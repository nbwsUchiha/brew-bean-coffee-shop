import type { Env } from "./types";
import { supabaseFetch } from "./supabase";

/** Atomically reduce stock for all items on a paid order via Postgres RPC. */
export async function reduceOrderInventory(env: Env, orderId: string): Promise<void> {
  await supabaseFetch(env, "/rest/v1/rpc/reduce_order_inventory", {
    method: "POST",
    body: JSON.stringify({ p_order_id: orderId }),
  });
}

/** Atomically restore stock for a refunded paid order via Postgres RPC. */
export async function restoreOrderInventory(env: Env, orderId: string): Promise<void> {
  await supabaseFetch(env, "/rest/v1/rpc/restore_order_inventory", {
    method: "POST",
    body: JSON.stringify({ p_order_id: orderId }),
  });
}
