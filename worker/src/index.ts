const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function supabaseFetch(env, path, init = {}) {
  const url = env.SUPABASE_URL.replace(/\/$/, "") + path;
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new Error("Supabase " + res.status + ": " + text);
  return body;
}

async function createStripeSession(env, { item, email, metadata }) {
  const secret = env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY missing");

  const amount = item.price_cents;
  const mode = "payment";
  const params = new URLSearchParams();
  params.set("mode", mode);
  params.set("success_url", env.STRIPE_SUCCESS_URL);
  params.set("cancel_url", env.STRIPE_CANCEL_URL);
  if (email) params.set("customer_email", email);
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(amount));
  params.set("line_items[0][price_data][product_data][name]", item.name);
  params.set("line_items[0][quantity]", "1");
  if (mode === "subscription") {
    params.set("line_items[0][price_data][recurring][interval]", "month");
  }
  Object.entries(metadata).forEach(([k, v], i) => {
    params.set("metadata[" + k + "]", v);
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + secret,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Stripe error");
  return data;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);

    try {
      if (url.pathname === "/v1/health") {
        return json({ ok: true, service: "coffee-shop" });
      }

      if (url.pathname === "/v1/catalog" && request.method === "GET") {
        const rows = await supabaseFetch(env, "/rest/v1/catalog_items?active=eq.true&select=*");
        return json({ data: rows });
      }

      if (url.pathname === "/v1/checkout/session" && request.method === "POST") {
        const body = await request.json();
        const itemId = body.itemId;
        const email = body.email || "";
        if (!itemId) return json({ error: { message: "itemId required" } }, 400);

        const items = await supabaseFetch(env, "/rest/v1/catalog_items?id=eq." + itemId + "&select=*");
        const item = items?.[0];
        if (!item) return json({ error: { message: "Item not found" } }, 404);

        const session = await createStripeSession(env, {
          item,
          email,
          metadata: { item_id: itemId, project: "coffee-shop" },
        });

        await supabaseFetch(env, "/rest/v1/orders", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            customer_email: email || null,
            item_id: itemId,
            amount_cents: item.price_cents,
            status: "pending",
            stripe_session_id: session.id,
            checkout_mode: "payment",
          }),
        });

        return json({ data: { url: session.url, sessionId: session.id } });
      }

      if (url.pathname === "/v1/webhooks/stripe" && request.method === "POST") {
        // Verify webhook in production using STRIPE_WEBHOOK_SECRET
        const event = await request.json();
        if (event.type === "checkout.session.completed") {
          const sessionId = event.data?.object?.id;
          if (sessionId) {
            await supabaseFetch(env, "/rest/v1/orders?stripe_session_id=eq." + sessionId, {
              method: "PATCH",
              headers: { Prefer: "return=minimal" },
              body: JSON.stringify({ status: "paid" }),
            });
          }
        }
        return json({ received: true });
      }

      return json({ error: { message: "Not found" } }, 404);
    } catch (err) {
      return json({ error: { message: err.message || "Internal error" } }, 500);
    }
  },
};
