import type { Env } from "./types";
import { supabaseFetch } from "./supabase";
import { fetchOrderBySession } from "./routes/orders";
import { sendOrderConfirmationEmail, sendRefundEmail } from "./email";
import { reduceOrderInventory, restoreOrderInventory } from "./inventory";

type CheckoutSession = {
  id?: string;
  customer_email?: string;
  payment_intent?: string;
};

type OrderRow = {
  id: string;
  payment_status: string;
  confirmation_email_sent_at?: string | null;
  refund_email_sent_at?: string | null;
};

export type WebhookProcessResult = { ok: true } | { ok: false; message: string };

async function findOrderBySession(env: Env, sessionId: string): Promise<OrderRow | null> {
  const rows = (await supabaseFetch(
    env,
    "/rest/v1/orders?stripe_session_id=eq." +
      encodeURIComponent(sessionId) +
      "&select=id,payment_status,confirmation_email_sent_at,refund_email_sent_at",
  )) as OrderRow[];
  return rows?.[0] ?? null;
}

async function findOrderByPaymentIntent(env: Env, paymentIntentId: string): Promise<OrderRow | null> {
  const rows = (await supabaseFetch(
    env,
    "/rest/v1/orders?stripe_payment_intent_id=eq." +
      encodeURIComponent(paymentIntentId) +
      "&select=id,payment_status,confirmation_email_sent_at,refund_email_sent_at",
  )) as OrderRow[];
  return rows?.[0] ?? null;
}

async function insertStatusOnce(env: Env, orderId: string, status: string, note: string) {
  const history = (await supabaseFetch(
    env,
    "/rest/v1/order_status_history?order_id=eq." +
      orderId +
      "&status=eq." +
      encodeURIComponent(status) +
      "&select=id&limit=1",
  )) as Array<{ id: string }>;
  if (!history?.[0]) {
    await supabaseFetch(env, "/rest/v1/order_status_history", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ order_id: orderId, status, note }),
    });
  }
}

/** Idempotent checkout.session.completed handler — all steps must succeed. */
export async function processCheckoutSessionCompleted(
  env: Env,
  session: CheckoutSession,
): Promise<WebhookProcessResult> {
  const sessionId = session.id;
  if (!sessionId) return { ok: false, message: "Missing session id in event" };

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
  )) as OrderRow[];

  let orderRow = updated?.[0];

  if (!orderRow) {
    const existing = await findOrderBySession(env, sessionId);
    if (!existing) return { ok: false, message: "Order not found for session " + sessionId };
    if (existing.payment_status !== "paid") {
      return { ok: false, message: "Order could not be marked paid" };
    }
    orderRow = existing;
  }

  await supabaseFetch(env, "/rest/v1/payments?stripe_session_id=eq." + encodeURIComponent(sessionId), {
    method: "PATCH",
    body: JSON.stringify({
      status: "paid",
      stripe_payment_intent_id: session.payment_intent ?? null,
    }),
  });

  await insertStatusOnce(env, orderRow.id, "paid", "Payment confirmed via Stripe");
  await reduceOrderInventory(env, orderRow.id);

  const order = await fetchOrderBySession(env, sessionId);
  if (!order) return { ok: false, message: "Order missing after inventory update" };

  if (!orderRow.confirmation_email_sent_at && order.customer_email) {
    await sendOrderConfirmationEmail(
      env,
      order as Parameters<typeof sendOrderConfirmationEmail>[1],
    );
    await supabaseFetch(env, "/rest/v1/orders?id=eq." + orderRow.id, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ confirmation_email_sent_at: new Date().toISOString() }),
    });
  }

  return { ok: true };
}

/** Mark abandoned checkout sessions so they do not look like open orders. */
export async function processCheckoutSessionExpired(
  env: Env,
  session: CheckoutSession,
): Promise<WebhookProcessResult> {
  const sessionId = session.id;
  if (!sessionId) return { ok: true };

  const order = await findOrderBySession(env, sessionId);
  if (!order) return { ok: true };
  if (order.payment_status === "paid" || order.payment_status === "refunded") return { ok: true };

  await supabaseFetch(
    env,
    "/rest/v1/orders?stripe_session_id=eq." +
      encodeURIComponent(sessionId) +
      "&payment_status=eq.pending",
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "cancelled",
        payment_status: "failed",
        order_status: "checkout_failed",
      }),
    },
  );

  await supabaseFetch(env, "/rest/v1/payments?stripe_session_id=eq." + encodeURIComponent(sessionId), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "failed" }),
  });

  await insertStatusOnce(env, order.id, "checkout_failed", "Checkout session expired");
  return { ok: true };
}

/** Record failed payment attempts without affecting fulfilled orders. */
export async function processPaymentIntentFailed(
  env: Env,
  paymentIntent: { id?: string },
): Promise<WebhookProcessResult> {
  const piId = paymentIntent.id;
  if (!piId) return { ok: true };

  const order = await findOrderByPaymentIntent(env, piId);
  if (!order || order.payment_status === "paid" || order.payment_status === "refunded") return { ok: true };

  await supabaseFetch(env, "/rest/v1/orders?id=eq." + order.id + "&payment_status=eq.pending", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "cancelled",
      payment_status: "failed",
      order_status: "failed",
    }),
  });

  await supabaseFetch(env, "/rest/v1/payments?order_id=eq." + order.id, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "failed" }),
  });

  await insertStatusOnce(env, order.id, "failed", "Payment failed via Stripe");
  return { ok: true };
}

/** Refund a paid order and restore inventory once. */
export async function processChargeRefunded(
  env: Env,
  charge: { payment_intent?: string },
): Promise<WebhookProcessResult> {
  const piId = charge.payment_intent;
  if (!piId) return { ok: false, message: "Missing payment_intent on refund" };

  const order = await findOrderByPaymentIntent(env, piId);
  if (!order) return { ok: false, message: "Order not found for refund" };

  await supabaseFetch(env, "/rest/v1/orders?id=eq." + order.id, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "refunded",
      payment_status: "refunded",
      order_status: "refunded",
    }),
  });

  await supabaseFetch(env, "/rest/v1/payments?order_id=eq." + order.id, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "refunded" }),
  });

  await insertStatusOnce(env, order.id, "refunded", "Payment refunded via Stripe");
  await restoreOrderInventory(env, order.id);

  const full = (await supabaseFetch(
    env,
    "/rest/v1/orders?id=eq." + order.id + "&select=order_number,customer_email,total_cents",
  )) as Array<{
    order_number: string | null;
    customer_email: string | null;
    total_cents: number;
  }>;

  const row = full?.[0];
  if (row && !order.refund_email_sent_at && row.customer_email) {
    await sendRefundEmail(env, row);
    await supabaseFetch(env, "/rest/v1/orders?id=eq." + order.id, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ refund_email_sent_at: new Date().toISOString() }),
    });
  }

  return { ok: true };
}
