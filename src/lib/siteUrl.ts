/** Canonical site origin for Supabase auth redirects (works locally + on Pages). */
export function getSiteUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  return fromEnv?.replace(/\/$/, "") || "http://localhost:5173";
}

export function authRedirectUrl(path = "/login"): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
