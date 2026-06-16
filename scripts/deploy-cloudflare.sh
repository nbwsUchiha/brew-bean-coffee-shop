#!/usr/bin/env bash
# Deploy coffee shop to Cloudflare (Worker + Pages).
# Prereqs: npx wrangler login, .env.local + worker/.dev.vars filled in.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: npx wrangler login"
  exit 1
fi

[[ -f .env.local ]] || { echo "Missing .env.local"; exit 1; }
[[ -f worker/.dev.vars ]] || { echo "Missing worker/.dev.vars"; exit 1; }

# shellcheck disable=SC1091
source .env.local
# shellcheck disable=SC1091
source worker/.dev.vars

PAGES_PROJECT="${CLOUDFLARE_PAGES_PROJECT_NAME:-brew-bean-coffee}"
PAGES_URL="https://${PAGES_PROJECT}.pages.dev"

echo "=== 1/4 Deploy Worker + secrets ==="
cd worker

printf '%s' "$SUPABASE_URL" | npx wrangler secret put SUPABASE_URL
printf '%s' "$SUPABASE_SERVICE_ROLE_KEY" | npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
printf '%s' "$STRIPE_SECRET_KEY" | npx wrangler secret put STRIPE_SECRET_KEY
printf '%s' "${STRIPE_WEBHOOK_SECRET:-whsec_placeholder}" | npx wrangler secret put STRIPE_WEBHOOK_SECRET
printf '%s' "${STRIPE_SUCCESS_URL:-$PAGES_URL/success}" | npx wrangler secret put STRIPE_SUCCESS_URL
printf '%s' "${STRIPE_CANCEL_URL:-$PAGES_URL/cancel}" | npx wrangler secret put STRIPE_CANCEL_URL

DEPLOY_LOG="$(npx wrangler deploy 2>&1)"
echo "$DEPLOY_LOG"
WORKER_URL="$(echo "$DEPLOY_LOG" | grep -oE 'https://[a-zA-Z0-9._-]+\.workers\.dev' | head -1 || true)"

if [[ -z "$WORKER_URL" ]]; then
  echo "Could not detect Worker URL from deploy output."
  echo "Set WORKER_URL env var and re-run, e.g.:"
  echo "  WORKER_URL=https://coffee-shop-api.yourname.workers.dev ./scripts/deploy-cloudflare.sh"
  exit 1
fi

cd "$ROOT"

echo "=== 2/4 Build frontend ==="
VITE_API_BASE_URL="$WORKER_URL" \
VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
npm run build

echo "=== 3/4 Create Pages project (if needed) ==="
if ! npx wrangler pages project list 2>/dev/null | grep -q "$PAGES_PROJECT"; then
  npx wrangler pages project create "$PAGES_PROJECT" --production-branch main || true
fi

echo "=== 4/4 Deploy Pages ==="
npx wrangler pages deploy dist --project-name "$PAGES_PROJECT"

echo ""
echo "Live!"
echo "  Website: $PAGES_URL"
echo "  API:     $WORKER_URL"
echo ""
echo "Stripe webhook (add in dashboard):"
echo "  ${WORKER_URL}/v1/webhooks/stripe"
echo "  Event: checkout.session.completed"
