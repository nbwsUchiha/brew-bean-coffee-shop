/**
 * Complete a Stripe Checkout session in test mode and verify webhook side effects.
 * Reads secrets from worker/.dev.vars — never prints secret values.
 */
import { readFileSync, existsSync } from "node:fs";
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
const stripeKey = env.STRIPE_SECRET_KEY;
const apiBase = "https://coffee-shop-api.brewbean.workers.dev";
const productId = "c361754b-5904-4f71-ab42-0ddfd8773765";

if (!stripeKey?.startsWith("sk_test_")) {
  console.log("FAIL missing Stripe test key in worker/.dev.vars");
  process.exit(1);
}

async function stripe(path, params = {}) {
  const body = new URLSearchParams(params);
  const res = await fetch("https://api.stripe.com/v1" + path, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + stripeKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString() || undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Stripe API error");
  return data;
}

async function stripeGet(path) {
  const res = await fetch("https://api.stripe.com/v1" + path, {
    headers: { Authorization: "Bearer " + stripeKey },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Stripe API error");
  return data;
}

async function main() {
  const stockBefore = await fetch(`${apiBase}/v1/products/cold-brew`).then((r) => r.json());
  const stockQtyBefore = stockBefore?.data?.stock_quantity;

  const sessionRes = await fetch(`${apiBase}/v1/checkout/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId, quantity: 1 }],
      email: "webhook-audit@example.com",
      fulfillmentMethod: "pickup",
    }),
  });
  const sessionBody = await sessionRes.json();
  if (!sessionRes.ok) throw new Error("Checkout session failed: " + JSON.stringify(sessionBody));
  const sessionId = sessionBody.data.sessionId;

  const orderBefore = await fetch(
    `${apiBase}/v1/orders/by-session?session_id=${encodeURIComponent(sessionId)}`,
  ).then((r) => r.json());
  console.log(
    "PASS order exists before payment:",
    orderBefore.data.order_number,
    "status=" + orderBefore.data.payment_status,
  );

  const session = await stripeGet("/checkout/sessions/" + sessionId);
  const pm = await stripe("/payment_methods", {
    type: "card",
    "card[token]": "tok_visa",
  });

  await stripe("/payment_intents/" + session.payment_intent + "/confirm", {
    payment_method: pm.id,
    return_url: "https://brew-bean-coffee.pages.dev/success",
  });

  console.log("PASS Stripe test payment confirmed for session", sessionId.slice(0, 14) + "...");

  let paid = false;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const order = await fetch(
      `${apiBase}/v1/orders/by-session?session_id=${encodeURIComponent(sessionId)}`,
    ).then((r) => r.json());
    if (order?.data?.payment_status === "paid") {
      paid = true;
      console.log("PASS order marked paid:", order.data.order_number);
      break;
    }
  }

  if (!paid) {
    console.log("FAIL order not marked paid after webhook — apply migrations/005_webhook_inventory.sql");
    process.exit(1);
  }

  const stockAfter = await fetch(`${apiBase}/v1/products/cold-brew`).then((r) => r.json());
  const stockQtyAfter = stockAfter?.data?.stock_quantity;
  if (typeof stockQtyBefore === "number" && stockQtyAfter === stockQtyBefore - 1) {
    console.log("PASS inventory reduced:", stockQtyBefore, "->", stockQtyAfter);
  } else {
    console.log(
      "FAIL inventory not reduced as expected:",
      stockQtyBefore,
      "->",
      stockQtyAfter,
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.log("FAIL", e.message?.slice(0, 200));
  process.exit(1);
});
