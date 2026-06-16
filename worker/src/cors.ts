import type { Env } from "./types";

export function allowedOrigins(env: Env): string[] {
  const raw = env.ALLOWED_ORIGINS || "http://localhost:5173,https://brew-bean-coffee.pages.dev";
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

export function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowed = allowedOrigins(env);
  const match = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": match,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,Stripe-Signature",
    Vary: "Origin",
  };
}

export function json(
  request: Request,
  env: Env,
  data: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(request, env), "Content-Type": "application/json", ...extra },
  });
}

export function errorResponse(request: Request, env: Env, message: string, status: number) {
  return json(request, env, { error: { message } }, status);
}
