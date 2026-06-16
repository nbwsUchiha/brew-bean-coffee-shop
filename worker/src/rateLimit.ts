import type { Env } from "./types";
import { supabaseFetch } from "./supabase";

export async function checkRateLimit(
  env: Env,
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000).toISOString();

  const existing = (await supabaseFetch(
    env,
    "/rest/v1/rate_limits?key=eq." + encodeURIComponent(key) + "&select=*",
  )) as Array<{ key: string; count: number; window_start: string }>;

  const row = existing?.[0];
  if (!row || row.window_start < windowStart) {
    await supabaseFetch(env, "/rest/v1/rate_limits", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ key, count: 1, window_start: now.toISOString() }),
    });
    return true;
  }

  if (row.count >= maxRequests) return false;

  await supabaseFetch(env, "/rest/v1/rate_limits?key=eq." + encodeURIComponent(key), {
    method: "PATCH",
    body: JSON.stringify({ count: row.count + 1 }),
  });
  return true;
}

export function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
}
