import type { Env } from "./types";
import { supabaseFetch } from "./supabase";

export type WebhookEventStatus = "processing" | "completed" | "failed";

export type WebhookEventRow = {
  id: string;
  event_type: string;
  status: WebhookEventStatus;
  error_message?: string | null;
};

/** Returns whether this delivery should be processed or is a duplicate completion. */
export async function claimWebhookEvent(
  env: Env,
  eventId: string,
  eventType: string,
): Promise<"duplicate" | "claimed"> {
  const existing = (await supabaseFetch(
    env,
    "/rest/v1/stripe_webhook_events?id=eq." + encodeURIComponent(eventId) + "&select=id,status",
  )) as WebhookEventRow[] | null;

  const row = existing?.[0];
  if (row?.status === "completed") return "duplicate";

  if (row) {
    await supabaseFetch(
      env,
      "/rest/v1/stripe_webhook_events?id=eq." +
        encodeURIComponent(eventId) +
        "&status=in.(failed,processing)",
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "processing", error_message: null }),
      },
    );
    return "claimed";
  }

  try {
    await supabaseFetch(env, "/rest/v1/stripe_webhook_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ id: eventId, event_type: eventType, status: "processing" }),
    });
  } catch (err) {
    const again = (await supabaseFetch(
      env,
      "/rest/v1/stripe_webhook_events?id=eq." + encodeURIComponent(eventId) + "&select=status",
    )) as WebhookEventRow[] | null;
    if (again?.[0]?.status === "completed") return "duplicate";
    throw err;
  }

  return "claimed";
}

export async function completeWebhookEvent(env: Env, eventId: string): Promise<void> {
  await supabaseFetch(env, "/rest/v1/stripe_webhook_events?id=eq." + encodeURIComponent(eventId), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "completed", error_message: null }),
  });
}

export async function failWebhookEvent(env: Env, eventId: string, message: string): Promise<void> {
  await supabaseFetch(env, "/rest/v1/stripe_webhook_events?id=eq." + encodeURIComponent(eventId), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "failed", error_message: message.slice(0, 500) }),
  });
}
