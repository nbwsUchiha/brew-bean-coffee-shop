import type { Env } from "../types";
import { supabaseFetch } from "../supabase";
import { json, errorResponse } from "../cors";
import { verifyStripeWebhook, parseStripeEvent } from "../stripe";
import { fetchOrderBySession } from "./orders";
import { sendOrderConfirmationEmail } from "../email";

export async function handleStripeWebhook(request: Request, env: Env, url: URL) {
  if (url.pathname !== "/v1/webhooks/stripe" || request.method !== "POST") return null;

  const rawBody = await request.text();
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return errorResponse(request, env, "Webhook not configured", 503);
  }

  const sig = request.headers.get("Stripe-Signature");
  const valid = await verifyStripeWebhook(rawBody, sig, secret);
  if (!valid) return errorResponse(request, env, "Invalid webhook signature", 400);

  const event = parseStripeEvent(rawBody);

  const existing = (await supabaseFetch(
    env,
    "/rest/v1/stripe_webhook_events?id=eq." + encodeURIComponent(event.id) + "&select=id",
  )) as Array<{ id: string }>;
  if (existing?.[0]) return json(request, env, { received: true, duplicate: true });

  await supabaseFetch(env, "/rest/v1/stripe_webhook_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ id: event.id, event_type: event.type }),
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object as {
      id?: string;
      customer_email?: string;
      payment_intent?: string;
    };
    const sessionId = session?.id;
    if (!sessionId) return json(request, env, { received: true });

    const paidAt = new Date().toISOString();

    const updated = (await supabaseFetch(
      env,
      "/rest/v1/orders?stripe_session_id=eq." +
        encodeURIComponent(sessionId) +
        "&payment_status=neq.paid",
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          status: "paid",
          payment_status: "paid",
          order_status: "paid",
          paid_at: paidAt,
          stripe_payment_intent_id: session.payment_intent ?? null,
        }),
      },
    )) as Array<{ id: string }>;

    const orderRow = updated?.[0];
    if (orderRow) {
      await supabaseFetch(env, "/rest/v1/payments?stripe_session_id=eq." + encodeURIComponent(sessionId), {
        method: "PATCH",
        body: JSON.stringify({
          status: "paid",
          stripe_payment_intent_id: session.payment_intent ?? null,
        }),
      });

      await supabaseFetch(env, "/rest/v1/order_status_history", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          order_id: orderRow.id,
          status: "paid",
          note: "Payment confirmed via Stripe",
        }),
      });

      const items = (await supabaseFetch(
        env,
        "/rest/v1/order_items?order_id=eq." + orderRow.id + "&select=product_id,quantity",
      )) as Array<{ product_id: string; quantity: number }>;

      for (const item of items) {
        if (!item.product_id) continue;
        const products = (await supabaseFetch(
          env,
          "/rest/v1/products?id=eq." + item.product_id + "&select=stock_quantity",
        )) as Array<{ stock_quantity: number }>;
        const stock = products?.[0]?.stock_quantity ?? 0;
        await supabaseFetch(env, "/rest/v1/products?id=eq." + item.product_id, {
          method: "PATCH",
          body: JSON.stringify({ stock_quantity: Math.max(0, stock - item.quantity) }),
        });
      }

      const order = await fetchOrderBySession(env, sessionId);
      if (order) {
        await sendOrderConfirmationEmail(env, order as Parameters<typeof sendOrderConfirmationEmail>[1]);
      }
    }
  }

  return json(request, env, { received: true });
}
