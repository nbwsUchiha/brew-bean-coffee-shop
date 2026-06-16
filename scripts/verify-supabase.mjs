/**
 * Local connectivity checks — never prints secret values.
 * Usage: node scripts/verify-supabase.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = { ...loadEnvFile(resolve(root, ".env")), ...loadEnvFile(resolve(root, ".env.local")) };
const workerEnv = loadEnvFile(resolve(root, "worker/.dev.vars"));
const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;
const apiBase = env.VITE_API_BASE_URL || "http://localhost:8787";

const checks = [];

function pass(name, detail = "ok") {
  checks.push({ name, ok: true, detail });
  console.log(`PASS  ${name}: ${detail}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}: ${detail}`);
}

function looksLikePlaceholder(value, minLen = 40) {
  if (!value) return true;
  if (value.includes("YOUR_PROJECT") || value.includes("your_project")) return true;
  if (value === "your-anon-key" || value === "your-service-role-key") return true;
  return value.length < minLen;
}

if (!url) fail("VITE_SUPABASE_URL", "missing in .env.local");
else if (looksLikePlaceholder(url, 20)) fail("VITE_SUPABASE_URL", "still looks like a placeholder — paste your real Supabase project URL");
else if (!url.includes("supabase.co")) fail("VITE_SUPABASE_URL", "must be a *.supabase.co URL");
else pass("VITE_SUPABASE_URL", "set");

if (!anon) fail("VITE_SUPABASE_ANON_KEY", "missing in .env.local");
else if (looksLikePlaceholder(anon, 40)) fail("VITE_SUPABASE_ANON_KEY", "still looks like a placeholder — paste the anon public key from Supabase API settings");
else pass("VITE_SUPABASE_ANON_KEY", "set");

if (env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  fail("frontend env leak", "remove VITE_SUPABASE_SERVICE_ROLE_KEY from .env.local — use worker/.dev.vars only");
} else {
  pass("frontend env leak", "no service role in VITE_* vars");
}

if (workerEnv.SUPABASE_SERVICE_ROLE_KEY) {
  if (looksLikePlaceholder(workerEnv.SUPABASE_SERVICE_ROLE_KEY, 40)) {
    fail("service role placement", "worker/.dev.vars SUPABASE_SERVICE_ROLE_KEY still looks like a placeholder");
  } else {
    pass("service role placement", "only in worker/.dev.vars");
  }
} else {
  fail("service role placement", "missing SUPABASE_SERVICE_ROLE_KEY in worker/.dev.vars");
}

if (url && anon && !looksLikePlaceholder(url, 20) && !looksLikePlaceholder(anon, 40)) {
  try {
    const authRes = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      headers: { apikey: anon },
    });
    if (authRes.ok) pass("Supabase auth health", `HTTP ${authRes.status}`);
    else fail("Supabase auth health", `HTTP ${authRes.status}`);
  } catch {
    fail("Supabase auth health", "network error — check URL");
  }

  try {
    const dbRes = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/categories?select=id,name&limit=1`,
      { headers: { apikey: anon, Authorization: `Bearer ${anon}` } },
    );
    const dbText = await dbRes.text();
    if (dbRes.ok) {
      pass("Supabase DB query (categories)", `HTTP ${dbRes.status}`);
    } else if (dbRes.status === 404 || /does not exist|relation/i.test(dbText)) {
      fail("Supabase DB query (categories)", "tables missing — run migrations 001–004 and seed.sql in Supabase SQL Editor");
    } else if (dbRes.status === 401 || dbRes.status === 403) {
      fail("Supabase DB query (categories)", "HTTP 401/403 — check anon key and RLS policies");
    } else {
      fail("Supabase DB query (categories)", `HTTP ${dbRes.status}`);
    }
  } catch {
    fail("Supabase DB query (categories)", "network error");
  }
}

try {
  const health = await fetch(`${apiBase}/v1/health`);
  if (health.ok) pass("Worker /v1/health", `HTTP ${health.status}`);
  else fail("Worker /v1/health", `HTTP ${health.status}`);

  const catalog = await fetch(`${apiBase}/v1/catalog`);
  const catalogBody = await catalog.json();
  if (catalog.ok && Array.isArray(catalogBody.data)) {
    pass("Worker /v1/catalog", `${catalogBody.data.length} products`);
  } else if (catalog.status === 503) {
    fail("Worker /v1/catalog", "database unavailable — check worker/.dev.vars and run migrations");
  } else {
    fail("Worker /v1/catalog", `HTTP ${catalog.status}`);
  }
} catch {
  fail("Worker API", "unreachable — start with: cd worker && npm run dev");
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
