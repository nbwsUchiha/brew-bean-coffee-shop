# Brew & Bean Coffee

Order your favorite drinks online for pickup.

**GitHub repo:** `brew-bean-coffee-shop` (standalone repository — own `origin`, branches, commits, and secrets)

Full-stack portfolio site: Vite + React, Cloudflare Pages + Workers, Supabase, Stripe.

## Stack

- **Frontend:** Vite + React → Cloudflare Pages
- **API:** Cloudflare Worker (`/v1/*`)
- **Database / auth:** Supabase Postgres + Auth
- **Payments:** Stripe Checkout (one-time)

## Business mode

`ordering` — Menu with Stripe checkout.

## Local setup

```bash
cp .env.example .env.local
cp worker/.dev.vars.example worker/.dev.vars
# Fill Supabase + Stripe values in both files
npm install
cd worker && npm install && cd ..
npm run dev
```

Worker (second terminal):

```bash
cd worker && npm run dev
```

## Database (Supabase)

1. Create a **new** Supabase project for this site only.
2. SQL Editor → run `migrations/001_schema.sql`
3. Run `migrations/seed.sql` for sample data.

## Go live (Cloudflare + GitHub Actions)

Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Purpose |
|--------|---------|
| `VITE_API_BASE_URL` | Worker URL (e.g. `https://coffee-shop-api.your-subdomain.workers.dev`) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `CLOUDFLARE_API_TOKEN` | Pages + Workers deploy token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_PAGES_PROJECT_NAME` | Pages project name |
| `SUPABASE_URL` | Worker Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker service role (secret) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_SUCCESS_URL` | `https://your-pages-domain/success` |
| `STRIPE_CANCEL_URL` | `https://your-pages-domain/cancel` |

Push to `main` → CI builds → deploy workflow publishes frontend + worker.

## Routes

| Page | Path |
|------|------|
| Home | `/` |
| Menu | `/catalog` |
| Checkout | `/checkout` |
| Login | `/login` |
