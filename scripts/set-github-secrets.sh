#!/usr/bin/env bash
# Load .env.local, .env.deploy, worker/.dev.vars → GitHub Actions secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="nbwsUchiha/brew-bean-coffee-shop"

if [[ ! -f "$ROOT/.env.local" ]]; then
  echo "Missing .env.local"
  exit 1
fi

# shellcheck disable=SC1091
source "$ROOT/.env.local"

if [[ -f "$ROOT/.env.deploy" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/.env.deploy"
fi

if [[ -f "$ROOT/worker/.dev.vars" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/worker/.dev.vars"
fi

: "${VITE_API_BASE_URL:?}"
: "${VITE_SUPABASE_URL:?}"
: "${VITE_SUPABASE_ANON_KEY:?}"
: "${SUPABASE_URL:?}"
: "${SUPABASE_SERVICE_ROLE_KEY:?}"
: "${STRIPE_SECRET_KEY:?}"
: "${STRIPE_WEBHOOK_SECRET:?}"
: "${CLOUDFLARE_API_TOKEN:?}"
: "${CLOUDFLARE_ACCOUNT_ID:?}"
: "${CLOUDFLARE_PAGES_PROJECT_NAME:=brew-bean-coffee}"

STRIPE_SUCCESS_URL="${STRIPE_SUCCESS_URL:-https://brew-bean-coffee.pages.dev/success?session_id={CHECKOUT_SESSION_ID}}"
STRIPE_CANCEL_URL="${STRIPE_CANCEL_URL:-https://brew-bean-coffee.pages.dev/cart}"
VITE_SITE_URL="${VITE_SITE_URL:-https://brew-bean-coffee.pages.dev}"

echo "Setting GitHub secrets on $REPO ..."

gh secret set VITE_API_BASE_URL --repo "$REPO" --body "$VITE_API_BASE_URL"
gh secret set VITE_SUPABASE_URL --repo "$REPO" --body "$VITE_SUPABASE_URL"
gh secret set VITE_SUPABASE_ANON_KEY --repo "$REPO" --body "$VITE_SUPABASE_ANON_KEY"
gh secret set VITE_SITE_URL --repo "$REPO" --body "$VITE_SITE_URL"
gh secret set CLOUDFLARE_API_TOKEN --repo "$REPO" --body "$CLOUDFLARE_API_TOKEN"
gh secret set CLOUDFLARE_ACCOUNT_ID --repo "$REPO" --body "$CLOUDFLARE_ACCOUNT_ID"
gh secret set CLOUDFLARE_PAGES_PROJECT_NAME --repo "$REPO" --body "$CLOUDFLARE_PAGES_PROJECT_NAME"
gh secret set SUPABASE_URL --repo "$REPO" --body "$SUPABASE_URL"
gh secret set SUPABASE_SERVICE_ROLE_KEY --repo "$REPO" --body "$SUPABASE_SERVICE_ROLE_KEY"
gh secret set STRIPE_SECRET_KEY --repo "$REPO" --body "$STRIPE_SECRET_KEY"
gh secret set STRIPE_WEBHOOK_SECRET --repo "$REPO" --body "$STRIPE_WEBHOOK_SECRET"
gh secret set STRIPE_SUCCESS_URL --repo "$REPO" --body "$STRIPE_SUCCESS_URL"
gh secret set STRIPE_CANCEL_URL --repo "$REPO" --body "$STRIPE_CANCEL_URL"

if [[ -n "${ADMIN_SETUP_SECRET:-}" ]]; then
  gh secret set ADMIN_SETUP_SECRET --repo "$REPO" --body "$ADMIN_SETUP_SECRET"
fi
if [[ -n "${RESEND_API_KEY:-}" ]]; then
  gh secret set RESEND_API_KEY --repo "$REPO" --body "$RESEND_API_KEY"
fi

echo "Done. Push to main or run Deploy workflow."
