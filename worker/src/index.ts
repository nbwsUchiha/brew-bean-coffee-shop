import type { Env } from "./types";
import { corsHeaders, json, errorResponse } from "./cors";
import { AuthError } from "./auth";
import { ValidationError } from "./validation";
import { handleProducts } from "./routes/products";
import { handleCheckout, handleProfile } from "./routes/checkout";
import { handleOrders, handleStats } from "./routes/orders";
import { handleContact } from "./routes/contact";
import { handleAdmin } from "./routes/admin";
import { handleStripeWebhook } from "./routes/webhooks";

export default {
  async fetch(request: Request, env: Env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/v1/health") {
        return json(request, env, { data: { ok: true, service: "coffee-shop" } });
      }

      const handlers = [
        handleStats,
        handleProducts,
        handleCheckout,
        handleProfile,
        handleOrders,
        handleContact,
        handleAdmin,
        handleStripeWebhook,
      ];

      for (const handler of handlers) {
        const res = await handler(request, env, url);
        if (res) return res;
      }

      return errorResponse(request, env, "Not found", 404);
    } catch (err) {
      if (err instanceof AuthError) return errorResponse(request, env, err.message, 401);
      if (err instanceof ValidationError) return errorResponse(request, env, err.message, 400);
      const message = err instanceof Error ? err.message : "Internal error";
      const isDb = message.startsWith("Database error");
      if (!isDb && !message.startsWith("Payment")) {
        console.error("Unhandled error:", message.slice(0, 120));
      }
      return errorResponse(request, env, isDb ? "Service unavailable" : "Internal error", isDb ? 503 : 500);
    }
  },
};
