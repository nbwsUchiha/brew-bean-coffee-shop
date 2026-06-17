import type { Env, AuthUser } from "./types";
import type { CartTotals } from "./types";
import { supabaseFetch } from "./supabase";

export type CheckoutBody = {
  email: string;
  customerName?: string;
  fulfillmentMethod: "pickup" | "delivery";
};

export type PendingOrderResult = {
  orderId: string;
  orderNumber: string;
};

/** Create pending order + line items + payment row before Stripe session exists. */
export async function createPendingOrder(
  env: Env,
  totals: CartTotals,
  body: CheckoutBody,
  user: AuthUser | null,
): Promise<PendingOrderResult> {
  const orderNumber = (await supabaseFetch(env, "/rest/v1/rpc/generate_order_number", {
    method: "POST",
    body: "{}",
  })) as string;

  const orderInsert = {
    order_number: orderNumber,
    user_id: user?.id ?? null,
    customer_email: body.email,
    customer_name: body.customerName ?? null,
    amount_cents: totals.totalCents,
    subtotal_cents: totals.subtotalCents,
    tax_cents: totals.taxCents,
    shipping_cents: totals.shippingCents,
    total_cents: totals.totalCents,
    status: "pending",
    payment_status: "pending",
    order_status: "pending",
    stripe_session_id: null,
    checkout_mode: "payment",
    fulfillment_method: body.fulfillmentMethod,
  };

  const orders = (await supabaseFetch(env, "/rest/v1/orders", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(orderInsert),
  })) as Array<{ id: string }>;

  const orderId = orders[0]?.id;
  if (!orderId) throw new Error("Failed to create order");

  const orderItems = totals.lines.map((l) => ({
    order_id: orderId,
    product_id: l.productId,
    product_name: l.name,
    product_slug: l.slug,
    quantity: l.quantity,
    unit_price_cents: l.unitPriceCents,
    line_total_cents: l.lineTotalCents,
  }));

  await supabaseFetch(env, "/rest/v1/order_items", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(orderItems),
  });

  await supabaseFetch(env, "/rest/v1/payments", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      order_id: orderId,
      stripe_session_id: null,
      amount_cents: totals.totalCents,
      status: "pending",
    }),
  });

  await supabaseFetch(env, "/rest/v1/order_status_history", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ order_id: orderId, status: "pending", note: "Checkout started" }),
  });

  return { orderId, orderNumber };
}

export async function attachStripeSessionToOrder(
  env: Env,
  orderId: string,
  sessionId: string,
): Promise<void> {
  await supabaseFetch(env, "/rest/v1/orders?id=eq." + orderId, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ stripe_session_id: sessionId }),
  });

  await supabaseFetch(env, "/rest/v1/payments?order_id=eq." + orderId, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ stripe_session_id: sessionId }),
  });
}

export async function markCheckoutFailed(env: Env, orderId: string, reason: string): Promise<void> {
  await supabaseFetch(env, "/rest/v1/orders?id=eq." + orderId, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "cancelled",
      payment_status: "failed",
      order_status: "checkout_failed",
    }),
  });

  await supabaseFetch(env, "/rest/v1/payments?order_id=eq." + orderId, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "failed" }),
  });

  await supabaseFetch(env, "/rest/v1/order_status_history", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      order_id: orderId,
      status: "checkout_failed",
      note: reason.slice(0, 200),
    }),
  });
}
