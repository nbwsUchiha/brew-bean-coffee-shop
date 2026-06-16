import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.trim();
  if (!v || v.includes("YOUR_PROJECT") || v.includes("your_project")) return true;
  if (v === "your-anon-key" || v === "public-anon-key") return true;
  return false;
}

export const supabaseConfigError =
  isPlaceholder(url) || isPlaceholder(anon) || !url?.includes("supabase.co") || (anon?.length ?? 0) < 40
    ? "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (use your Supabase project URL and anon public key)."
    : null;

if (import.meta.env.DEV && supabaseConfigError) {
  console.warn(`[Supabase] ${supabaseConfigError}`);
}

export const supabase = createClient(url ?? "", anon ?? "");
