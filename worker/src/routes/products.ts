import type { Env, Product } from "../types";
import { supabaseFetch } from "../supabase";
import { json, errorResponse } from "../cors";

const PRODUCT_SELECT =
  "id,name,slug,description,short_description,category_id,price_cents,sale_price_cents,image_url,stock_quantity,available,featured,origin,roast_level,size_weight,created_at,updated_at,categories(name,slug),product_images(id,url,sort_order)";

export async function handleProducts(request: Request, env: Env, url: URL) {
  if (url.pathname === "/v1/catalog" && request.method === "GET") {
    const rows = (await supabaseFetch(
      env,
      "/rest/v1/products?available=eq.true&select=" + encodeURIComponent(PRODUCT_SELECT) + "&order=featured.desc,name.asc",
    )) as Product[];
    return json(request, env, { data: rows });
  }

  if (url.pathname === "/v1/products" && request.method === "GET") {
    const q = url.searchParams.get("q")?.trim();
    const category = url.searchParams.get("category");
    const sort = url.searchParams.get("sort") || "featured";
    const featured = url.searchParams.get("featured");

    let path = "/rest/v1/products?available=eq.true&select=" + encodeURIComponent(PRODUCT_SELECT);

    if (category) path += "&categories.slug=eq." + encodeURIComponent(category);
    if (featured === "true") path += "&featured=eq.true";
    if (q) path += "&or=(name.ilike.*" + encodeURIComponent(q) + "*,description.ilike.*" + encodeURIComponent(q) + "*)";

    const orderMap: Record<string, string> = {
      featured: "featured.desc,name.asc",
      "price-asc": "price_cents.asc",
      "price-desc": "price_cents.desc",
      name: "name.asc",
    };
    path += "&order=" + (orderMap[sort] || orderMap.featured);

    const rows = (await supabaseFetch(env, path)) as Product[];
    return json(request, env, { data: rows });
  }

  if (url.pathname.startsWith("/v1/products/") && request.method === "GET") {
    const slug = decodeURIComponent(url.pathname.replace("/v1/products/", ""));
    const rows = (await supabaseFetch(
      env,
      "/rest/v1/products?slug=eq." + encodeURIComponent(slug) + "&available=eq.true&select=" + encodeURIComponent(PRODUCT_SELECT),
    )) as Product[];
    const product = rows?.[0];
    if (!product) return errorResponse(request, env, "Product not found", 404);
    return json(request, env, { data: product });
  }

  if (url.pathname === "/v1/categories" && request.method === "GET") {
    const rows = await supabaseFetch(env, "/rest/v1/categories?select=*&order=name.asc");
    return json(request, env, { data: rows });
  }

  return null;
}

export async function fetchProductsByIds(env: Env, ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const inFilter = "(" + ids.join(",") + ")";
  return (await supabaseFetch(
    env,
    "/rest/v1/products?id=in." + encodeURIComponent(inFilter) + "&select=" + encodeURIComponent(PRODUCT_SELECT),
  )) as Product[];
}
