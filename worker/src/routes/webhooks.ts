import type { Env } from "../types";
import { json, errorResponse } from "../cors";
import { verifyStripeWebhook, parseStripeEvent } from "../stripe";
import { claimWebhookEvent, completeWebhookEvent, failWebhookEvent } from "../webhookEvents";
import {
  processCheckoutSessionCompleted,
  processCheckoutSessionExpired,
  processPaymentIntentFailed,
  processChargeRefunded,
} from "../webhookProcessing";

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

  const claim = await claimWebhookEvent(env, event.id, event.type);
  if (claim === "duplicate") {
    return json(request, env, { received: true, duplicate: true });
  }

  try {
    let result: { ok: boolean; message?: string } = { ok: true };

    if (event.type === "checkout.session.completed") {
      result = await processCheckoutSessionCompleted(
        env,
        event.data?.object as { id?: string; customer_email?: string; payment_intent?: string },
      );
    } else if (event.type === "checkout.session.expired") {
      result = await processCheckoutSessionExpired(
        env,
        event.data?.object as { id?: string },
      );
    } else if (event.type === "payment_intent.payment_failed") {
      result = await processPaymentIntentFailed(
        env,
        event.data?.object as { id?: string },
      );
    } else if (event.type === "charge.refunded") {
      result = await processChargeRefunded(
        env,
        event.data?.object as { payment_intent?: string },
      );
    }

    if (!result.ok) {
      await failWebhookEvent(env, event.id, result.message || "Webhook processing incomplete");
      return errorResponse(request, env, "Webhook processing incomplete", 500);
    }

    await completeWebhookEvent(env, event.id);
    return json(request, env, { received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    await failWebhookEvent(env, event.id, message);
    return errorResponse(request, env, "Webhook processing failed", 500);
  }
}
