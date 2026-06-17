import type { Env } from "./types";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(iso));
}

async function sendEmail(env: Env, to: string, subject: string, html: string) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.RESEND_FROM || "Brew & Bean <onboarding@resend.dev>";
  if (!apiKey) {
    console.log("Email skipped: RESEND_API_KEY not configured");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    console.error("Email delivery failed: HTTP", res.status);
    return false;
  }
  return true;
}

function emailShell(env: Env, title: string, body: string) {
  const store = env.STORE_NAME || "Brew & Bean Coffee";
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;background:#faf6f1;padding:24px;color:#2a211c">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e8ddd3">
    <p style="margin:0 0 8px;color:#8b5e3c;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${store}</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#5c3d2e">${title}</h1>
    ${body}
  </div>
</body></html>`;
}

export async function sendOrderConfirmationEmail(
  env: Env,
  order: {
    order_number: string | null;
    customer_email: string | null;
    total_cents: number;
    order_status: string;
    fulfillment_method: string;
    paid_at: string | null;
    created_at: string;
    order_items?: Array<{ product_name: string; quantity: number; line_total_cents: number }>;
  },
) {
  const to = order.customer_email;
  if (!to) return;

  const store = env.STORE_NAME || "Brew & Bean Coffee";
  const items = (order.order_items || [])
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.quantity}× ${i.product_name}</td><td style="padding:6px 0;text-align:right">${formatMoney(i.line_total_cents)}</td></tr>`,
    )
    .join("");

  const html = emailShell(
    env,
    "Order confirmed",
    `<p style="margin:0 0 20px;color:#6b5c52">Thanks for your order!</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      <tr><td style="padding:8px 0;color:#6b5c52">Order</td><td style="padding:8px 0;text-align:right;font-family:monospace">${order.order_number || "—"}</td></tr>
      ${items}
      <tr><td style="padding:8px 0;color:#6b5c52"><strong>Total</strong></td><td style="padding:8px 0;text-align:right"><strong>${formatMoney(order.total_cents)}</strong></td></tr>
      <tr><td style="padding:8px 0;color:#6b5c52">Fulfillment</td><td style="padding:8px 0;text-align:right;text-transform:capitalize">${order.fulfillment_method}</td></tr>
      <tr><td style="padding:8px 0;color:#6b5c52">Placed at</td><td style="padding:8px 0;text-align:right">${formatTimestamp(order.paid_at || order.created_at)}</td></tr>
    </table>
    <p style="margin:24px 0 0;color:#6b5c52;font-size:14px">Show this email at the counter if asked.</p>`,
  );

  await sendEmail(env, to, `${store} order confirmed — ${order.order_number || "receipt"}`, html);
}

export async function sendOrderStatusEmail(
  env: Env,
  order: { customer_email: string | null; order_number: string | null; order_status: string },
) {
  const to = order.customer_email;
  if (!to) return;
  const store = env.STORE_NAME || "Brew & Bean Coffee";
  const html = emailShell(
    env,
    "Order update",
    `<p style="color:#6b5c52">Your order <strong>${order.order_number || ""}</strong> is now <strong>${order.order_status}</strong>.</p>`,
  );
  await sendEmail(env, to, `${store} order update — ${order.order_status}`, html);
}

export async function sendContactAckEmail(env: Env, name: string, email: string) {
  const store = env.STORE_NAME || "Brew & Bean Coffee";
  const html = emailShell(
    env,
    "We received your message",
    `<p style="color:#6b5c52">Hi ${name}, thanks for contacting ${store}. We'll get back to you within one business day.</p>`,
  );
  await sendEmail(env, email, `${store} — message received`, html);
}

export async function sendRefundEmail(
  env: Env,
  order: { order_number: string | null; customer_email: string | null; total_cents: number },
) {
  const to = order.customer_email;
  if (!to) return;
  const store = env.STORE_NAME || "Brew & Bean Coffee";
  const html = emailShell(
    env,
    "Refund processed",
    `<p style="color:#6b5c52">Your order <strong>${order.order_number || ""}</strong> has been refunded for <strong>${formatMoney(order.total_cents)}</strong>. Allow a few business days for the refund to appear on your statement.</p>`,
  );
  await sendEmail(env, to, `${store} refund — ${order.order_number || "order"}`, html);
}
