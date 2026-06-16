/**
 * Split .env.local into safe frontend file + .env.deploy + worker/.dev.vars
 * Never prints secret values.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localPath = resolve(root, ".env.local");
const deployPath = resolve(root, ".env.deploy");
const workerPath = resolve(root, "worker/.dev.vars");

const frontendKeys = new Set(["VITE_API_BASE_URL", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_SITE_URL"]);
const deployKeys = new Set([
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_PAGES_PROJECT_NAME",
]);
const workerKeys = new Set([
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_SUCCESS_URL",
  "STRIPE_CANCEL_URL",
  "ALLOWED_ORIGINS",
  "ADMIN_SETUP_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "STORE_NAME",
  "TAX_RATE_BPS",
  "PICKUP_FEE_CENTS",
  "DELIVERY_FEE_CENTS",
]);

function parse(path) {
  const lines = readFileSync(path, "utf8").split("\n");
  const map = {};
  const raw = {};
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    raw[k] = t;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    map[k] = v;
  }
  return { map, raw };
}

if (!existsSync(localPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const { map } = parse(localPath);
const existingWorker = existsSync(workerPath) ? parse(workerPath).map : {};
const existingDeploy = existsSync(deployPath) ? parse(deployPath).map : {};

const frontend = {};
const deploy = { ...existingDeploy };
const worker = { ...existingWorker };

for (const [k, v] of Object.entries(map)) {
  if (frontendKeys.has(k)) frontend[k] = v;
  else if (deployKeys.has(k)) deploy[k] = v;
  else if (workerKeys.has(k)) worker[k] = worker[k] || v;
  else if (k.startsWith("VITE_")) frontend[k] = v;
  else worker[k] = worker[k] || v;
}

// Expected production defaults when unset
worker.STRIPE_SUCCESS_URL =
  worker.STRIPE_SUCCESS_URL ||
  "https://brew-bean-coffee.pages.dev/success?session_id={CHECKOUT_SESSION_ID}";
worker.STRIPE_CANCEL_URL = worker.STRIPE_CANCEL_URL || "https://brew-bean-coffee.pages.dev/cart";
worker.ALLOWED_ORIGINS = worker.ALLOWED_ORIGINS || "https://brew-bean-coffee.pages.dev";
deploy.CLOUDFLARE_PAGES_PROJECT_NAME = deploy.CLOUDFLARE_PAGES_PROJECT_NAME || "brew-bean-coffee";
frontend.VITE_API_BASE_URL = frontend.VITE_API_BASE_URL || "https://coffee-shop-api.brewbean.workers.dev";
frontend.VITE_SITE_URL = frontend.VITE_SITE_URL || "https://brew-bean-coffee.pages.dev";

function formatBlock(title, entries) {
  const lines = [`# ${title}`, ""];
  for (const [k, v] of Object.entries(entries)) {
    const needsQuote = /[\s&<>]/.test(v);
    lines.push(`${k}=${needsQuote ? `"${v}"` : v}`);
  }
  lines.push("");
  return lines.join("\n");
}

writeFileSync(localPath, formatBlock("Frontend (Vite) — public build vars only", frontend));
writeFileSync(deployPath, formatBlock("Deploy credentials — gitignored", deploy));
writeFileSync(workerPath, formatBlock("Worker secrets — gitignored", worker));

console.log("Split complete:");
console.log("  .env.local —", Object.keys(frontend).length, "frontend keys");
console.log("  .env.deploy —", Object.keys(deploy).length, "deploy keys");
console.log("  worker/.dev.vars —", Object.keys(worker).length, "worker keys");
