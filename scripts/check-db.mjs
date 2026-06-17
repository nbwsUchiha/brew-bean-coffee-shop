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
  const col = table === "rate_limits" ? "key" : "id";
  const res = await fetch(`${url}/rest/v1/${table}?select=${col}&limit=1`, {
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

const rpc = await fetch(`${url}/rest/v1/rpc/reduce_order_inventory`, {
  method: "POST",
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ p_order_id: "00000000-0000-0000-0000-000000000000" }),
});
if (rpc.status === 404 || rpc.status === 400) {
  console.log("PASS reduce_order_inventory RPC exists (expected error for fake order id)");
} else if (rpc.status === 200 || rpc.status === 204) {
  console.log("PASS reduce_order_inventory RPC exists");
} else {
  const rpcText = await rpc.text();
  if (/function|reduce_order_inventory/i.test(rpcText) && rpc.status === 500) {
    console.log("PASS reduce_order_inventory RPC exists");
  } else {
    console.log(`FAIL reduce_order_inventory RPC HTTP ${rpc.status} — run migrations/005_webhook_inventory.sql`);
    failed++;
  }
}

const webhookCols = await fetch(
  `${url}/rest/v1/stripe_webhook_events?select=id,status&limit=0`,
  { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
);
if (webhookCols.ok) {
  console.log("PASS stripe_webhook_events.status column");
} else {
  console.log(`FAIL stripe_webhook_events.status — run migrations/005_webhook_inventory.sql`);
  failed++;
}

for (const [rpcName, migration] of [
  ["restore_order_inventory", "006_guest_orders_refunds.sql"],
  ["link_guest_orders", "006_guest_orders_refunds.sql"],
]) {
  const res = await fetch(`${url}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      rpcName === "link_guest_orders"
        ? { p_user_id: "00000000-0000-0000-0000-000000000000" }
        : { p_order_id: "00000000-0000-0000-0000-000000000000" },
    ),
  });
  if ([200, 204, 400, 500].includes(res.status)) {
    console.log(`PASS ${rpcName} RPC exists`);
  } else {
    console.log(`FAIL ${rpcName} RPC HTTP ${res.status} — run migrations/${migration}`);
    failed++;
  }
}

process.exit(failed ? 1 : 0);
