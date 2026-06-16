import type { Env } from "../types";
import { supabaseFetch } from "../supabase";
import { json, errorResponse } from "../cors";
import { contactSchema, parseBody } from "../validation";
import { checkRateLimit, clientIp } from "../rateLimit";
import { sendContactAckEmail } from "../email";

async function hashIp(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + ":contact"));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export async function handleContact(request: Request, env: Env, url: URL) {
  if (url.pathname !== "/v1/contact" || request.method !== "POST") return null;

  const ip = clientIp(request);
  const allowed = await checkRateLimit(env, `contact:${ip}`, 5, 3600);
  if (!allowed) return errorResponse(request, env, "Too many messages. Try again later.", 429);

  const body = parseBody(contactSchema, await request.json());
  const ipHash = await hashIp(ip);

  await supabaseFetch(env, "/rest/v1/contact_submissions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      name: body.name,
      email: body.email,
      subject: body.subject ?? null,
      message: body.message,
      ip_hash: ipHash,
    }),
  });

  await sendContactAckEmail(env, body.name, body.email);
  return json(request, env, { data: { ok: true } });
}
