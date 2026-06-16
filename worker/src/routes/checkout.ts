import type { Env } from "../types";
import { supabaseFetch } from "../supabase";
import { requireUser } from "../auth";
import { json, errorResponse } from "../cors";
import { checkoutSchema, parseBody } from "../validation";
import { priceCart } from "../pricing";
import { fetchProductsByIds } from "./products";
import { createStripeCheckoutSession } from "../stripe";
import { checkRateLimit, clientIp } from "../rateLimit";

export async function handleCheckout(request: Request, env: Env, url: URL) {
  if (url.pathname === "/v1/checkout/quote" && request.method === "POST") {
    const body = parseBody(checkoutSchema, await request.json());
    const productIds = body.items.map((i) => i.productId);
    const products = await fetchProductsByIds(env, productIds);
    const totals = priceCart(env, body.items, products, body.fulfillmentMethod ?? "pickup");
    return json(request, env, { data: totals });
  }

  if (url.pathname === "/v1/checkout/session" && request.method === "POST") {
    const ip = clientIp(request);
    const allowed = await checkRateLimit(env, `checkout:${ip}`, 10, 3600);
    if (!allowed) return errorResponse(request, env, "Too many checkout attempts. Try again later.", 429);

    const raw = (await request.json()) as Record<string, unknown>;
    const body = raw.itemId
      ? parseBody(checkoutSchema, {
          items: [{ productId: String(raw.itemId), quantity: 1 }],
          email: typeof raw.email === "string" && raw.email ? raw.email : "guest@example.com",
          fulfillmentMethod: "pickup" as const,
        })
      : parseBody(checkoutSchema, raw);

    const fulfillmentMethod = body.fulfillmentMethod ?? "pickup";
    const user = await (async () => {
      try {
        const { verifyUser } = await import("../auth");
        return await verifyUser(request, env);
      } catch {
        return null;
      }
    })();

    const productIds = body.items.map((i) => i.productId);
    const products = await fetchProductsByIds(env, productIds);
    const totals = priceCart(env, body.items, products, fulfillmentMethod);

    const lineItems = totals.lines.map((l) => ({
      name: l.name,
      unitAmountCents: l.unitPriceCents,
      quantity: l.quantity,
    }));

    if (totals.shippingCents > 0) {
      lineItems.push({
        name: fulfillmentMethod === "delivery" ? "Delivery" : "Service fee",
        unitAmountCents: totals.shippingCents,
        quantity: 1,
      });
    }
    if (totals.taxCents > 0) {
      lineItems.push({ name: "Tax", unitAmountCents: totals.taxCents, quantity: 1 });
    }

    const orderNumber = (await supabaseFetch(env, "/rest/v1/rpc/generate_order_number", {
      method: "POST",
      body: "{}",
    })) as string;

    const session = await createStripeCheckoutSession(env, {
      email: body.email,
      lineItems,
      metadata: {
        project: "coffee-shop",
        order_number: orderNumber,
        fulfillment_method: fulfillmentMethod,
      },
    });

    if (!session.id || !session.url) throw new Error("Payment session could not be created");

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
      stripe_session_id: session.id,
      checkout_mode: "payment",
      fulfillment_method: fulfillmentMethod,
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
        stripe_session_id: session.id,
        amount_cents: totals.totalCents,
        status: "pending",
      }),
    });

    await supabaseFetch(env, "/rest/v1/order_status_history", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ order_id: orderId, status: "pending", note: "Checkout started" }),
    });

    return json(request, env, { data: { url: session.url, sessionId: session.id, orderNumber } });
  }

  return null;
}

export async function handleProfile(request: Request, env: Env, url: URL) {
  if (url.pathname === "/v1/profile" && request.method === "GET") {
    const user = await requireUser(request, env);
    const rows = (await supabaseFetch(
      env,
      "/rest/v1/profiles?id=eq." + user.id + "&select=*",
    )) as unknown[];
    return json(request, env, { data: rows?.[0] ?? null });
  }

  if (url.pathname === "/v1/profile" && request.method === "PATCH") {
    const user = await requireUser(request, env);
    const { profileUpdateSchema, parseBody } = await import("../validation");
    const body = parseBody(profileUpdateSchema, await request.json());
    const patch: Record<string, string | undefined> = {};
    if (body.fullName !== undefined) patch.full_name = body.fullName;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.addressLine1 !== undefined) patch.address_line1 = body.addressLine1;
    if (body.addressLine2 !== undefined) patch.address_line2 = body.addressLine2;
    if (body.city !== undefined) patch.city = body.city;
    if (body.state !== undefined) patch.state = body.state;
    if (body.postalCode !== undefined) patch.postal_code = body.postalCode;

    const rows = (await supabaseFetch(env, "/rest/v1/profiles?id=eq." + user.id, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    })) as unknown[];
    return json(request, env, { data: rows?.[0] ?? null });
  }

  return null;
}
