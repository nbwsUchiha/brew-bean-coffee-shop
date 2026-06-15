# Deploy Brew & Bean Coffee (site #1)

Follow these steps in order. Each step explains **what** you're doing and **why**.

## Overview

```
Browser → Cloudflare Pages (frontend)
       → Cloudflare Worker (API)
       → Supabase (database + auth)
       → Stripe (payments)
```

---

## Step 1 — Supabase (new project for this site only)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Name it e.g. `brew-bean-coffee`
3. Save the database password somewhere safe
4. When ready, open **SQL Editor** and run, in order:
   - `migrations/001_schema.sql`
   - `migrations/seed.sql`
5. Go to **Project Settings → API** and copy:
   - Project URL → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (never put in frontend)

---

## Step 2 — Stripe (test mode is fine)

1. [dashboard.stripe.com](https://dashboard.stripe.com) → **Developers → API keys**
2. Copy **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`
3. For webhooks (after Worker is deployed):
   - **Developers → Webhooks → Add endpoint**
   - URL: `https://coffee-shop-api.<your-subdomain>.workers.dev/v1/webhooks/stripe`
   - Events: `checkout.session.completed`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`

---

## Step 3 — Cloudflare login (local terminal)

```bash
cd /Users/sarahamjed/workspace/internship-portfolio/coffee-shop
npx wrangler login
```

Complete the browser prompt. Then note your **Account ID** from the Cloudflare dashboard (right sidebar on any zone/account page).

Create a **API Token** with:
- Account → Cloudflare Pages → Edit
- Account → Workers Scripts → Edit

---

## Step 4 — Local env files

```bash
cp .env.example .env.local
cp worker/.dev.vars.example worker/.dev.vars
```

Fill both files with your real values. Keep `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` as localhost for now; update after Pages deploy.

Test locally:

```bash
npm run dev
# second terminal:
cd worker && npm run dev
```

Open http://localhost:5173/catalog — you should see 3 drinks from Supabase.

---

## Step 5 — Deploy Worker

```bash
cd worker
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler deploy
```

Copy the Worker URL (e.g. `https://coffee-shop-api.nbwsuchiha.workers.dev`).

Update Stripe webhook URL to `{WORKER_URL}/v1/webhooks/stripe`.

---

## Step 6 — Deploy frontend (Cloudflare Pages)

```bash
cd ..   # back to coffee-shop root
npm run build
npx wrangler pages project create brew-bean-coffee --production-branch main
npx wrangler pages deploy dist --project-name brew-bean-coffee
```

Copy the Pages URL (e.g. `https://brew-bean-coffee.pages.dev`).

Rebuild with production API URL:

```bash
VITE_API_BASE_URL=https://YOUR-WORKER-URL \
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
VITE_SUPABASE_ANON_KEY=your-anon-key \
npm run build

npx wrangler pages deploy dist --project-name brew-bean-coffee
```

Update Worker vars for Stripe redirects:

```bash
cd worker
npx wrangler secret put STRIPE_SUCCESS_URL   # https://brew-bean-coffee.pages.dev/success
npx wrangler secret put STRIPE_CANCEL_URL    # https://brew-bean-coffee.pages.dev/cancel
```

Or set in `wrangler.toml` `[vars]` and redeploy.

---

## Step 7 — GitHub Actions secrets (automated deploys)

Run from project root (replace values):

```bash
./scripts/set-github-secrets.sh
```

Or manually: repo **Settings → Secrets and variables → Actions** — add every key from `.env.example`.

After secrets exist, push to `main` → CI + Deploy run automatically.

---

## Step 8 — Smoke test

- [ ] Homepage loads on Pages URL
- [ ] `/catalog` shows 3 menu items
- [ ] Sign up / sign in works (Supabase Auth)
- [ ] Checkout redirects to Stripe test page
- [ ] Test card `4242 4242 4242 4242` completes
- [ ] `/success` loads after payment

---

## Your live URLs (fill in after deploy)

| Service | URL |
|---------|-----|
| Website | |
| API | |
| GitHub | https://github.com/nbwsUchiha/brew-bean-coffee-shop |
| Supabase | |
| Stripe webhook | |
