/**
 * Apply migrations/005_webhook_inventory.sql via Supabase SQL API.
 * Requires SUPABASE_ACCESS_TOKEN (personal access token) or DATABASE_URL.
 * Never prints secret values.
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

const worker = loadEnv(resolve(root, "worker/.dev.vars"));
const sql = readFileSync(resolve(root, "migrations/005_webhook_inventory.sql"), "utf8");
const databaseUrl = process.env.DATABASE_URL || worker.DATABASE_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN || worker.SUPABASE_ACCESS_TOKEN;
const projectRef = (worker.SUPABASE_URL || "").match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

async function applyViaManagementApi() {
  if (!accessToken || !projectRef) return false;
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (res.ok) {
    console.log("PASS migration 005 applied via Supabase Management API");
    return true;
  }
  console.log(`FAIL management API HTTP ${res.status}`);
  return false;
}

async function applyViaPostgres() {
  if (!databaseUrl) return false;
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log("PASS migration 005 applied via DATABASE_URL");
    return true;
  } finally {
    await client.end();
  }
}

async function main() {
  if (await applyViaPostgres()) return;
  if (await applyViaManagementApi()) return;
  console.log("Manual step required:");
  console.log("  Open Supabase SQL Editor and run migrations/005_webhook_inventory.sql");
  process.exit(1);
}

main().catch((err) => {
  console.log("FAIL", err.message?.slice(0, 120) || "migration apply failed");
  process.exit(1);
});
