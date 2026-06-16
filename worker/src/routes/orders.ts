import type { Env } from "../types";
import { supabaseFetch } from "../supabase";
import { requireUser } from "../auth";
import { json, errorResponse } from "../cors";

const ORDER_SELECT =
  "id,order_number,user_id,customer_email,customer_name,subtotal_cents,tax_cents,shipping_cents,total_cents,amount_cents,payment_status,order_status,status,stripe_session_id,stripe_payment_intent_id,fulfillment_method,created_at,updated_at,paid_at,order_items(id,product_id,product_name,product_slug,quantity,unit_price_cents,line_total_cents),order_status_history(id,status,note,created_at)";

export async function handleOrders(request: Request, env: Env, url: URL) {
  if (url.pathname === "/v1/orders/by-session" && request.method === "GET") {
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) return errorResponse(request, env, "session_id required", 400);
    const order = await fetchOrderBySession(env, sessionId);
    if (!order) return errorResponse(request, env, "Order not found", 404);
    return json(request, env, { data: order });
  }

  if (url.pathname === "/v1/orders" && request.method === "GET") {
    const user = await requireUser(request, env);
    const rows = await supabaseFetch(
      env,
      "/rest/v1/orders?user_id=eq." + user.id + "&select=" + encodeURIComponent(ORDER_SELECT) + "&order=created_at.desc",
    );
    return json(request, env, { data: rows });
  }

  if (url.pathname.startsWith("/v1/orders/") && request.method === "GET") {
    const id = url.pathname.replace("/v1/orders/", "");
    const user = await requireUser(request, env);
    const rows = (await supabaseFetch(
      env,
      "/rest/v1/orders?id=eq." + encodeURIComponent(id) + "&user_id=eq." + user.id + "&select=" + encodeURIComponent(ORDER_SELECT),
    )) as unknown[];
    if (!rows?.[0]) return errorResponse(request, env, "Order not found", 404);
    return json(request, env, { data: rows[0] });
  }

  return null;
}

export async function fetchOrderBySession(env: Env, sessionId: string) {
  const rows = (await supabaseFetch(
    env,
    "/rest/v1/orders?stripe_session_id=eq." +
      encodeURIComponent(sessionId) +
      "&select=" +
      encodeURIComponent(ORDER_SELECT),
  )) as Array<Record<string, unknown>>;
  return rows?.[0] ?? null;
}

export async function handleStats(request: Request, env: Env, url: URL) {
  if (url.pathname === "/v1/stats" && request.method === "GET") {
    const menu = (await supabaseFetch(env, "/rest/v1/products?available=eq.true&select=id")) as unknown[];
    const paid = (await supabaseFetch(
      env,
      "/rest/v1/orders?payment_status=eq.paid&select=id,paid_at,created_at&order=paid_at.desc.nullslast,created_at.desc&limit=1",
    )) as Array<{ paid_at?: string; created_at: string }>;
    const paidCount = (await supabaseFetch(
      env,
      "/rest/v1/orders?payment_status=eq.paid&select=id",
    )) as unknown[];

    const last = paid?.[0];
    return json(request, env, {
      data: {
        menuCount: menu?.length ?? 0,
        ordersFulfilled: paidCount?.length ?? 0,
        lastOrderAt: last?.paid_at || last?.created_at || null,
        pickupMinutes: 15,
      },
    });
  }
  return null;
}
