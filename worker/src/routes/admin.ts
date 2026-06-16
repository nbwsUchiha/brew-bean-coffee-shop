import type { Env } from "../types";
import { supabaseFetch } from "../supabase";
import { requireAdmin } from "../auth";
import { json, errorResponse } from "../cors";
import {
  productSchema,
  categorySchema,
  orderStatusSchema,
  adminSetupSchema,
  parseBody,
} from "../validation";
import { sendOrderStatusEmail } from "../email";

const ORDER_ADMIN_SELECT =
  "id,order_number,customer_email,customer_name,total_cents,payment_status,order_status,fulfillment_method,created_at,paid_at,order_items(product_name,quantity,line_total_cents)";

export async function handleAdmin(request: Request, env: Env, url: URL) {
  if (url.pathname === "/v1/admin/setup" && request.method === "POST") {
    const body = parseBody(adminSetupSchema, await request.json());
    if (!env.ADMIN_SETUP_SECRET || body.secret !== env.ADMIN_SETUP_SECRET) {
      return errorResponse(request, env, "Invalid setup secret", 403);
    }
    const profiles = (await supabaseFetch(
      env,
      "/rest/v1/profiles?email=eq." + encodeURIComponent(body.email) + "&select=id",
    )) as Array<{ id: string }>;
    const profile = profiles?.[0];
    if (!profile) return errorResponse(request, env, "User not found. They must sign up first.", 404);

    await supabaseFetch(env, "/rest/v1/profiles?id=eq." + profile.id, {
      method: "PATCH",
      body: JSON.stringify({ role: "admin" }),
    });
    return json(request, env, { data: { ok: true } });
  }

  try {
    await requireAdmin(request, env);
  } catch {
    return errorResponse(request, env, "Admin access required", 403);
  }

  if (url.pathname === "/v1/admin/stats" && request.method === "GET") {
    const paid = (await supabaseFetch(
      env,
      "/rest/v1/orders?payment_status=eq.paid&select=total_cents",
    )) as Array<{ total_cents: number }>;
    const revenue = paid.reduce((s, o) => s + (o.total_cents || 0), 0);
    const lowStock = (await supabaseFetch(
      env,
      "/rest/v1/products?stock_quantity=lt.10&available=eq.true&select=id,name,stock_quantity&order=stock_quantity.asc&limit=10",
    )) as unknown[];
    const pending = (await supabaseFetch(
      env,
      "/rest/v1/orders?order_status=in.(paid,preparing)&select=id&order=created_at.desc",
    )) as unknown[];
    return json(request, env, {
      data: { revenueCents: revenue, paidOrderCount: paid.length, lowStock, activeOrders: pending.length },
    });
  }

  if (url.pathname === "/v1/admin/products" && request.method === "GET") {
    const rows = await supabaseFetch(
      env,
      "/rest/v1/products?select=*,categories(name,slug)&order=name.asc",
    );
    return json(request, env, { data: rows });
  }

  if (url.pathname === "/v1/admin/products" && request.method === "POST") {
    const body = parseBody(productSchema, await request.json());
    const rows = (await supabaseFetch(env, "/rest/v1/products", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name: body.name,
        slug: body.slug,
        description: body.description ?? null,
        short_description: body.shortDescription ?? null,
        category_id: body.categoryId ?? null,
        price_cents: body.priceCents,
        sale_price_cents: body.salePriceCents ?? null,
        image_url: body.imageUrl || null,
        stock_quantity: body.stockQuantity,
        available: body.available,
        featured: body.featured,
        origin: body.origin ?? null,
        roast_level: body.roastLevel ?? null,
        size_weight: body.sizeWeight ?? null,
      }),
    })) as unknown[];
    return json(request, env, { data: rows?.[0] }, 201);
  }

  if (url.pathname.startsWith("/v1/admin/products/") && request.method === "PATCH") {
    const id = url.pathname.replace("/v1/admin/products/", "");
    const body = parseBody(productSchema.partial(), await request.json());
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.slug !== undefined) patch.slug = body.slug;
    if (body.description !== undefined) patch.description = body.description;
    if (body.shortDescription !== undefined) patch.short_description = body.shortDescription;
    if (body.categoryId !== undefined) patch.category_id = body.categoryId;
    if (body.priceCents !== undefined) patch.price_cents = body.priceCents;
    if (body.salePriceCents !== undefined) patch.sale_price_cents = body.salePriceCents;
    if (body.imageUrl !== undefined) patch.image_url = body.imageUrl || null;
    if (body.stockQuantity !== undefined) patch.stock_quantity = body.stockQuantity;
    if (body.available !== undefined) patch.available = body.available;
    if (body.featured !== undefined) patch.featured = body.featured;
    if (body.origin !== undefined) patch.origin = body.origin;
    if (body.roastLevel !== undefined) patch.roast_level = body.roastLevel;
    if (body.sizeWeight !== undefined) patch.size_weight = body.sizeWeight;

    const rows = (await supabaseFetch(env, "/rest/v1/products?id=eq." + encodeURIComponent(id), {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    })) as unknown[];
    return json(request, env, { data: rows?.[0] });
  }

  if (url.pathname.startsWith("/v1/admin/products/") && request.method === "DELETE") {
    const id = url.pathname.replace("/v1/admin/products/", "");
    await supabaseFetch(env, "/rest/v1/products?id=eq." + encodeURIComponent(id), {
      method: "PATCH",
      body: JSON.stringify({ available: false }),
    });
    return json(request, env, { data: { ok: true } });
  }

  if (url.pathname === "/v1/admin/categories" && request.method === "GET") {
    const rows = await supabaseFetch(env, "/rest/v1/categories?select=*&order=name.asc");
    return json(request, env, { data: rows });
  }

  if (url.pathname === "/v1/admin/categories" && request.method === "POST") {
    const body = parseBody(categorySchema, await request.json());
    const rows = (await supabaseFetch(env, "/rest/v1/categories", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name: body.name,
        slug: body.slug,
        description: body.description ?? null,
      }),
    })) as unknown[];
    return json(request, env, { data: rows?.[0] }, 201);
  }

  if (url.pathname === "/v1/admin/orders" && request.method === "GET") {
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q");
    let path = "/rest/v1/orders?select=" + encodeURIComponent(ORDER_ADMIN_SELECT) + "&order=created_at.desc&limit=50";
    if (status) path += "&order_status=eq." + encodeURIComponent(status);
    if (q) path += "&or=(order_number.ilike.*" + encodeURIComponent(q) + "*,customer_email.ilike.*" + encodeURIComponent(q) + "*)";
    const rows = await supabaseFetch(env, path);
    return json(request, env, { data: rows });
  }

  if (url.pathname.startsWith("/v1/admin/orders/") && request.method === "PATCH") {
    const id = url.pathname.replace("/v1/admin/orders/", "");
    const body = parseBody(orderStatusSchema, await request.json());

    const rows = (await supabaseFetch(env, "/rest/v1/orders?id=eq." + encodeURIComponent(id), {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ order_status: body.orderStatus }),
    })) as Array<{
      customer_email: string | null;
      order_number: string | null;
      order_status: string;
    }>;

    await supabaseFetch(env, "/rest/v1/order_status_history", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        order_id: id,
        status: body.orderStatus,
        note: body.note ?? null,
      }),
    });

    const order = rows?.[0];
    if (order) await sendOrderStatusEmail(env, order);
    return json(request, env, { data: order });
  }

  if (url.pathname === "/v1/admin/contact" && request.method === "GET") {
    const rows = await supabaseFetch(
      env,
      "/rest/v1/contact_submissions?select=*&order=created_at.desc&limit=50",
    );
    return json(request, env, { data: rows });
  }

  return errorResponse(request, env, "Not found", 404);
}
