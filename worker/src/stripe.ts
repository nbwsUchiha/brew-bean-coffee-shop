import type { Env } from "./types";

export async function createStripeCheckoutSession(
  env: Env,
  opts: {
    email: string;
    lineItems: Array<{ name: string; unitAmountCents: number; quantity: number }>;
    metadata: Record<string, string>;
  },
) {
  const secret = env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Payment configuration missing");

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", env.STRIPE_SUCCESS_URL);
  params.set("cancel_url", env.STRIPE_CANCEL_URL);
  params.set("customer_email", opts.email);

  opts.lineItems.forEach((item, i) => {
    params.set(`line_items[${i}][price_data][currency]`, "usd");
    params.set(`line_items[${i}][price_data][unit_amount]`, String(item.unitAmountCents));
    params.set(`line_items[${i}][price_data][product_data][name]`, item.name);
    params.set(`line_items[${i}][quantity]`, String(item.quantity));
  });

  Object.entries(opts.metadata).forEach(([k, v]) => params.set(`metadata[${k}]`, v));

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + secret,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = (await res.json()) as { url?: string; id?: string; error?: { message: string } };
  if (!res.ok) throw new Error(data.error?.message || "Payment provider error");
  return data;
}

/** Sign a webhook payload for tests and tooling (matches verifyStripeWebhook). */
export async function signStripeWebhook(
  payload: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<string> {
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const v1 = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${v1}`;
}

/** Verify Stripe webhook signature (HMAC SHA256). */
export async function verifyStripeWebhook(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    }),
  ) as Record<string, string>;

  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;

  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
  if (age > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expected.length !== v1.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  return mismatch === 0;
}

export type StripeEvent = {
  id: string;
  type: string;
  data?: { object?: Record<string, unknown> };
};

export function parseStripeEvent(payload: string): StripeEvent {
  return JSON.parse(payload) as StripeEvent;
}
