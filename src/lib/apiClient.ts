type CatalogItem = { id: string; name: string; description: string; price_cents: number };

const base = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8787";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(base + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || "Request failed");
  return body.data as T;
}

export const api = {
  getCatalog: () => request<CatalogItem[]>("/v1/catalog"),
  createCheckout: (itemId: string, email?: string) =>
    request<{ url: string }>("/v1/checkout/session", {
      method: "POST",
      body: JSON.stringify({ itemId, email }),
    }),
};
