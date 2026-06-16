/**
 * Check Supabase schema via REST (uses env vars, never prints secrets).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[t.slice(0, eq).trim()] = v;
  }
  return out;
}

const local = loadEnv(resolve(root, ".env.local"));
const worker = loadEnv(resolve(root, "worker/.dev.vars"));
const url = (worker.SUPABASE_URL || local.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = worker.SUPABASE_SERVICE_ROLE_KEY;
const anon = local.VITE_SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.log("FAIL cannot check DB — Supabase URL or service key not configured");
  process.exit(1);
}

const tables = [
  "profiles",
  "categories",
  "products",
  "customer_addresses",
  "orders",
  "order_items",
  "payments",
  "order_status_history",
  "contact_submissions",
  "stripe_webhook_events",
  "rate_limits",
];

async function headTable(table, key) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return res.status;
}

console.log("DATABASE CHECK");
let failed = 0;
for (const table of tables) {
  const status = await headTable(table, serviceKey);
  if (status === 200) console.log(`PASS table ${table} exists`);
  else {
    console.log(`FAIL table ${table} HTTP ${status}`);
    failed++;
  }
}

const products = await fetch(`${url}/rest/v1/products?select=id,slug&limit=10`, {
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
});
if (products.ok) {
  const rows = await products.json();
  console.log(`PASS seed products count (sample): ${rows.length} row(s) returned in first page`);
} else {
  console.log(`FAIL products query HTTP ${products.status}`);
  failed++;
}

if (anon) {
  const pub = await fetch(`${url}/rest/v1/products?available=eq.true&select=id&limit=1`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  console.log(pub.ok ? "PASS public RLS read products via anon key" : `FAIL public products via anon HTTP ${pub.status}`);
  if (!pub.ok) failed++;
}

const bucket = await fetch(`${url}/storage/v1/bucket/product-images`, {
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
});
console.log(bucket.ok ? "PASS storage bucket product-images" : `FAIL storage bucket HTTP ${bucket.status}`);
if (!bucket.ok) failed++;

process.exit(failed ? 1 : 0);
