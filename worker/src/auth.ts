import type { Env, AuthUser } from "./types";
import { supabaseFetch } from "./supabase";

export async function verifyUser(request: Request, env: Env): Promise<AuthUser | null> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);

  const res = await fetch(env.SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/user", {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + token,
    },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string; email?: string };
  if (!user.id) return null;
  return { id: user.id, email: user.email ?? null };
}

export async function requireUser(request: Request, env: Env): Promise<AuthUser> {
  const user = await verifyUser(request, env);
  if (!user) throw new AuthError("Authentication required");
  return user;
}

export async function requireAdmin(request: Request, env: Env): Promise<AuthUser> {
  const user = await requireUser(request, env);
  const rows = (await supabaseFetch(
    env,
    "/rest/v1/profiles?id=eq." + user.id + "&select=role",
  )) as Array<{ role: string }>;
  if (rows?.[0]?.role !== "admin") throw new AuthError("Admin access required");
  return user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
