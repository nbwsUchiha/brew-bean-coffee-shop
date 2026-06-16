#!/usr/bin/env bash
# Push worker/.dev.vars secrets to Cloudflare Worker (coffee-shop-api).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VARS="$ROOT/worker/.dev.vars"

if [[ ! -f "$VARS" ]]; then
  echo "Missing worker/.dev.vars"
  exit 1
fi

# shellcheck disable=SC1091
source "$VARS"

cd "$ROOT/worker"

put_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "Skip $name (empty)"
    return
  fi
  printf '%s' "$value" | npx wrangler secret put "$name"
}

put_secret SUPABASE_URL "${SUPABASE_URL:-}"
put_secret SUPABASE_SERVICE_ROLE_KEY "${SUPABASE_SERVICE_ROLE_KEY:-}"
put_secret STRIPE_SECRET_KEY "${STRIPE_SECRET_KEY:-}"
put_secret STRIPE_WEBHOOK_SECRET "${STRIPE_WEBHOOK_SECRET:-}"
put_secret ADMIN_SETUP_SECRET "${ADMIN_SETUP_SECRET:-}"
put_secret RESEND_API_KEY "${RESEND_API_KEY:-}"

echo "Deploying Worker code..."
npx wrangler deploy

echo "Worker deploy complete."
