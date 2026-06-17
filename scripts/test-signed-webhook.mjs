/**
 * Send a signed checkout.session.completed webhook to production Worker.
 * Uses real session + order created via checkout API. Never prints secrets.
 */
import { readFileSync, existsSync } from "node:fs";
import { createHmac } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[t.slice(0, eq).trim()] = v;
  }
  return out;
}

const env = loadEnv(resolve(root, "worker/.dev.vars"));
const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
const stripeKey = env.STRIPE_SECRET_KEY;
const apiBase = "https://coffee-shop-api.brewbean.workers.dev";
const workerWebhook = apiBase + "/v1/webhooks/stripe";
const productId = "c361754b-5904-4f71-ab42-0ddfd8773765";

function signPayload(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  return `t=${timestamp},v1=${signed}`;
}

async function main() {
  if (!webhookSecret?.startsWith("whsec_")) {
    console.log("FAIL missing webhook secret");
    process.exit(1);
  }

  const stockBefore = await fetch(`${apiBase}/v1/products/cold-brew`).then((r) => r.json());
  const stockQtyBefore = stockBefore?.data?.stock_quantity;

  const sessionRes = await fetch(`${apiBase}/v1/checkout/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId, quantity: 1 }],
      email: "webhook-signed@example.com",
      fulfillmentMethod: "pickup",
    }),
  });
  const { data } = await sessionRes.json();
  const sessionId = data.sessionId;

  const event = {
    id: "evt_audit_" + Date.now(),
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        payment_intent: "pi_audit_test_" + Date.now(),
        customer_email: "webhook-signed@example.com",
        payment_status: "paid",
      },
    },
  };

  const payload = JSON.stringify(event);
  const sig = signPayload(payload, webhookSecret);

  const res = await fetch(workerWebhook, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": sig },
    body: payload,
  });
  const body = await res.json();
  console.log("webhook HTTP", res.status, JSON.stringify(body));

  if (res.status !== 200) {
    if (res.status === 400) {
      console.log(
        "FAIL invalid webhook signature — ensure worker/.dev.vars STRIPE_WEBHOOK_SECRET matches the Cloudflare Worker secret and Stripe dashboard endpoint",
      );
    } else {
      console.log("FAIL webhook processing HTTP", res.status);
    }
    process.exit(1);
  }

  const order = await fetch(
    `${apiBase}/v1/orders/by-session?session_id=${encodeURIComponent(sessionId)}`,
  ).then((r) => r.json());
  console.log("order payment_status:", order.data.payment_status);

  const stockAfter = await fetch(`${apiBase}/v1/products/cold-brew`).then((r) => r.json());
  console.log("stock:", stockQtyBefore, "->", stockAfter?.data?.stock_quantity);

  if (order.data.payment_status !== "paid") {
    console.log("FAIL order not paid");
    process.exit(1);
  }
  if (stockAfter?.data?.stock_quantity !== stockQtyBefore - 1) {
    console.log("FAIL inventory not reduced");
    process.exit(1);
  }
  console.log("PASS signed webhook flow complete");

  // Duplicate delivery: reuse same timestamp/signature so event id is the only key
  const res2 = await fetch(workerWebhook, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": sig },
    body: payload,
  });
  const body2 = await res2.json();
  const stockDup = await fetch(`${apiBase}/v1/products/cold-brew`).then((r) => r.json());
  if (res2.status === 200 && body2.duplicate && stockDup?.data?.stock_quantity === stockAfter?.data?.stock_quantity) {
    console.log("PASS duplicate webhook idempotent");
  } else {
    console.log("FAIL duplicate webhook handling", res2.status, JSON.stringify(body2));
    process.exit(1);
  }
}

main().catch((e) => {
  console.log("FAIL", e.message?.slice(0, 200));
  process.exit(1);
});
