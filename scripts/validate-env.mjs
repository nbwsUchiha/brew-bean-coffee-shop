/**
 * Validates env file structure without printing secret values.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return null;
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

function meta(val) {
  if (!val) return { set: false };
  return {
    set: true,
    len: val.length,
    placeholder: /YOUR_PROJECT|your-anon|your-service|sk_test_\.\.\.|whsec_\.\.\.|^choose-a-long-random-secret$/i.test(val),
    jwt: val.startsWith("eyJ"),
    sk: val.startsWith("sk_test_") || val.startsWith("sk_live_"),
    whsec: val.startsWith("whsec_"),
  };
}

const issues = [];
const passes = [];

const local = loadEnvFile(resolve(root, ".env.local"));
const worker = loadEnvFile(resolve(root, "worker/.dev.vars"));

const frontendAllowed = ["VITE_API_BASE_URL", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_SITE_URL"];
const frontendForbidden = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_PAGES_PROJECT_NAME",
  "ADMIN_SETUP_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "STRIPE_SUCCESS_URL",
  "STRIPE_CANCEL_URL",
  "ALLOWED_ORIGINS",
];

if (!local) issues.push(".env.local missing");
else {
  for (const k of frontendAllowed) {
    const m = meta(local[k]);
    if (!m.set) issues.push(`.env.local missing ${k}`);
    else if (m.placeholder || (k.includes("ANON") && !m.jwt && m.len < 40)) issues.push(`.env.local ${k} looks like placeholder`);
    else passes.push(`.env.local ${k} ok`);
  }
  for (const k of Object.keys(local)) {
    if (k.startsWith("VITE_") && !frontendAllowed.includes(k)) {
      issues.push(`.env.local unexpected VITE_ key: ${k}`);
    }
    if (frontendForbidden.includes(k)) {
      issues.push(`.env.local must not contain ${k} — move to worker/.dev.vars or .env.deploy`);
    }
  }
  if (local.VITE_API_BASE_URL !== "https://coffee-shop-api.brewbean.workers.dev") {
    issues.push(".env.local VITE_API_BASE_URL should be https://coffee-shop-api.brewbean.workers.dev");
  } else if (!issues.some((i) => i.includes("VITE_API_BASE_URL"))) {
    passes.push(".env.local VITE_API_BASE_URL url ok");
  }
  if (local.VITE_SITE_URL !== "https://brew-bean-coffee.pages.dev") {
    issues.push(".env.local VITE_SITE_URL should be https://brew-bean-coffee.pages.dev");
  } else if (!issues.some((i) => i.includes("VITE_SITE_URL placeholder"))) {
    passes.push(".env.local VITE_SITE_URL url ok");
  }
}

const workerRequired = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_SUCCESS_URL",
  "STRIPE_CANCEL_URL",
  "ALLOWED_ORIGINS",
  "ADMIN_SETUP_SECRET",
];

if (!worker) issues.push("worker/.dev.vars missing");
else {
  for (const k of workerRequired) {
    const m = meta(worker[k]);
    if (!m.set) issues.push(`worker/.dev.vars missing ${k}`);
    else if (k === "ADMIN_SETUP_SECRET" && m.len < 12) issues.push(`worker/.dev.vars ${k} looks like placeholder`);
    else if (k !== "ADMIN_SETUP_SECRET" && m.placeholder) issues.push(`worker/.dev.vars ${k} looks like placeholder`);
    else passes.push(`worker/.dev.vars ${k} ok`);
  }
  const success =
    worker.STRIPE_SUCCESS_URL ===
    "https://brew-bean-coffee.pages.dev/success?session_id={CHECKOUT_SESSION_ID}";
  const cancel = worker.STRIPE_CANCEL_URL === "https://brew-bean-coffee.pages.dev/cart";
  const originsOk = worker.ALLOWED_ORIGINS?.includes("https://brew-bean-coffee.pages.dev");
  if (!success) issues.push("worker/.dev.vars STRIPE_SUCCESS_URL mismatch");
  else passes.push("worker/.dev.vars STRIPE_SUCCESS_URL url ok");
  if (!cancel) issues.push("worker/.dev.vars STRIPE_CANCEL_URL should be https://brew-bean-coffee.pages.dev/cart");
  else passes.push("worker/.dev.vars STRIPE_CANCEL_URL url ok");
  if (!originsOk) issues.push("worker/.dev.vars ALLOWED_ORIGINS must include https://brew-bean-coffee.pages.dev");
  else passes.push("worker/.dev.vars ALLOWED_ORIGINS url ok");
}

console.log("ENV VALIDATION");
for (const p of passes) console.log("PASS", p);
for (const i of issues) console.log("FAIL", i);
console.log(`\n${passes.length} passed, ${issues.length} failed`);
process.exit(issues.length ? 1 : 0);
