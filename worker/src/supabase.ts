import type { Env } from "./types";

export async function supabaseFetch(env: Env, path: string, init: RequestInit = {}) {
  const url = env.SUPABASE_URL.replace(/\/$/, "") + path;
  const headers: Record<string, string> = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = typeof body === "object" && body && "message" in body
      ? String((body as { message: string }).message)
      : text;
    throw new Error("Database error: " + msg);
  }
  return body;
}

export async function supabaseUserFetch(
  env: Env,
  path: string,
  accessToken: string,
  init: RequestInit = {},
) {
  const url = env.SUPABASE_URL.replace(/\/$/, "") + path;
  const anonKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const headers: Record<string, string> = {
    apikey: anonKey,
    Authorization: "Bearer " + accessToken,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) throw new Error("Request failed");
  return body;
}
