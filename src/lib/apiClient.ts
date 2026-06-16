import type {
  CartTotals,
  Category,
  Order,
  Product,
  Profile,
  SiteStats,
} from "./types";
import { supabase } from "./supabaseClient";

const base = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8787";

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(base + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || "Request failed");
  return body.data as T;
}

export const api = {
  getHealth: () => request<{ ok: boolean }>("/v1/health"),

  getCatalog: () => request<Product[]>("/v1/catalog"),
  getProducts: (params?: { q?: string; category?: string; sort?: string; featured?: boolean }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.category) sp.set("category", params.category);
    if (params?.sort) sp.set("sort", params.sort);
    if (params?.featured) sp.set("featured", "true");
    const qs = sp.toString();
    return request<Product[]>(`/v1/products${qs ? `?${qs}` : ""}`);
  },
  getProduct: (slug: string) => request<Product>(`/v1/products/${encodeURIComponent(slug)}`),
  getCategories: () => request<Category[]>("/v1/categories"),

  getStats: () => request<SiteStats>("/v1/stats"),

  quoteCheckout: (payload: {
    items: Array<{ productId: string; quantity: number }>;
    email: string;
    fulfillmentMethod: "pickup" | "delivery";
  }) =>
    request<CartTotals>("/v1/checkout/quote", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createCheckout: (payload: {
    items: Array<{ productId: string; quantity: number }>;
    email: string;
    customerName?: string;
    fulfillmentMethod: "pickup" | "delivery";
  }) =>
    request<{ url: string; sessionId: string; orderNumber: string }>("/v1/checkout/session", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getOrderBySession: (sessionId: string) =>
    request<Order>(`/v1/orders/by-session?session_id=${encodeURIComponent(sessionId)}`),
  getOrders: () => request<Order[]>("/v1/orders"),
  getOrder: (id: string) => request<Order>(`/v1/orders/${encodeURIComponent(id)}`),

  getProfile: () => request<Profile | null>("/v1/profile"),
  updateProfile: (payload: Record<string, string | undefined>) =>
    request<Profile>("/v1/profile", { method: "PATCH", body: JSON.stringify(payload) }),

  submitContact: (payload: { name: string; email: string; subject?: string; message: string }) =>
    request<{ ok: boolean }>("/v1/contact", { method: "POST", body: JSON.stringify(payload) }),

  adminStats: () => request<{ revenueCents: number; paidOrderCount: number; lowStock: unknown[]; activeOrders: number }>("/v1/admin/stats"),
  adminProducts: () => request<Product[]>("/v1/admin/products"),
  adminCreateProduct: (payload: Record<string, unknown>) =>
    request<Product>("/v1/admin/products", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdateProduct: (id: string, payload: Record<string, unknown>) =>
    request<Product>(`/v1/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminDeleteProduct: (id: string) =>
    request<{ ok: boolean }>(`/v1/admin/products/${id}`, { method: "DELETE" }),
  adminCategories: () => request<Category[]>("/v1/admin/categories"),
  adminCreateCategory: (payload: { name: string; slug: string; description?: string }) =>
    request<Category>("/v1/admin/categories", { method: "POST", body: JSON.stringify(payload) }),
  adminOrders: (params?: { status?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.q) sp.set("q", params.q);
    const qs = sp.toString();
    return request<Order[]>(`/v1/admin/orders${qs ? `?${qs}` : ""}`);
  },
  adminUpdateOrderStatus: (id: string, orderStatus: string, note?: string) =>
    request<Order>(`/v1/admin/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ orderStatus, note }),
    }),
  adminContact: () => request<unknown[]>("/v1/admin/contact"),
};
