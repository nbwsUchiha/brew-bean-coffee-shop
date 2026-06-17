import type { Env } from "../types";
import { json, errorResponse } from "../cors";
import { checkoutSchema, parseBody } from "../validation";
import { priceCart } from "../pricing";
import { fetchProductsByIds } from "./products";
import { createStripeCheckoutSession } from "../stripe";
import { checkRateLimit, clientIp } from "../rateLimit";
import {
  createPendingOrder,
  attachStripeSessionToOrder,
  markCheckoutFailed,
} from "../checkoutOrder";

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

    let orderId: string | null = null;
    let orderNumber: string | null = null;

    try {
      const pending = await createPendingOrder(
        env,
        totals,
        { email: body.email, customerName: body.customerName, fulfillmentMethod },
        user,
      );
      orderId = pending.orderId;
      orderNumber = pending.orderNumber;

      const session = await createStripeCheckoutSession(env, {
        email: body.email,
        lineItems,
        metadata: {
          project: "coffee-shop",
          order_id: orderId,
          order_number: orderNumber,
          fulfillment_method: fulfillmentMethod,
        },
      });

      if (!session.id || !session.url) {
        throw new Error("Payment session could not be created");
      }

      await attachStripeSessionToOrder(env, orderId, session.id);

      return json(request, env, {
        data: { url: session.url, sessionId: session.id, orderNumber },
      });
    } catch (err) {
      if (orderId) {
        const reason = err instanceof Error ? err.message : "Stripe session creation failed";
        try {
          await markCheckoutFailed(env, orderId, reason);
        } catch {
          // Best-effort cleanup; original error is still thrown.
        }
      }
      throw err;
    }
  }

  return null;
}

export async function handleProfile(request: Request, env: Env, url: URL) {
  if (url.pathname === "/v1/profile" && request.method === "GET") {
    const { requireUser } = await import("../auth");
    const user = await requireUser(request, env);
    const { supabaseFetch } = await import("../supabase");
    const rows = (await supabaseFetch(
      env,
      "/rest/v1/profiles?id=eq." + user.id + "&select=*",
    )) as unknown[];
    return json(request, env, { data: rows?.[0] ?? null });
  }

  if (url.pathname === "/v1/profile" && request.method === "PATCH") {
    const { requireUser } = await import("../auth");
    const user = await requireUser(request, env);
    const { profileUpdateSchema, parseBody } = await import("../validation");
    const { supabaseFetch } = await import("../supabase");
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
