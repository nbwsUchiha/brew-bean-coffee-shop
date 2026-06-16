# Brew & Bean Coffee

Production-ready full-stack coffee ecommerce: order online for pickup or local delivery.

**Live site:** https://brew-bean-coffee.pages.dev/

## Technology stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite, React 18, React Router, Tailwind CSS |
| API | Cloudflare Worker (`coffee-shop-api`) |
| Database & auth | Supabase Postgres + Auth |
| Payments | Stripe Checkout (test mode) |
| Email | Resend (optional) |
| Deploy | Cloudflare Pages + Workers, GitHub Actions |

## Architecture

```
Browser (Pages) ──► Worker /v1/* ──► Supabase (service role)
                 └──► Supabase Auth (anon key, client-side)
Stripe ──webhook──► Worker ──► orders, inventory, emails
```

- **Public product reads** use Worker → Supabase with RLS-friendly queries.
- **Checkout** validates cart lines, loads prices from DB, creates Stripe session server-side.
- **Orders** are confirmed only after Stripe webhook signature verification.
- **Admin** routes require JWT + `profiles.role = 'admin'`.

## Local setup

```bash
cp .env.example .env.local
cp worker/.dev.vars.example worker/.dev.vars
# Fill Supabase + Stripe values
npm install
cd worker && npm install && cd ..
npm run dev          # frontend :5173
cd worker && npm run dev   # API :8787
```

## Database migrations

In Supabase SQL Editor, run in order:

1. `migrations/001_schema.sql`
2. `migrations/002_order_paid_at.sql`
3. `migrations/003_ecommerce_schema.sql`
4. `migrations/004_storage.sql`
5. `migrations/seed.sql`

## Supabase setup

1. Create a dedicated Supabase project.
2. Run migrations above.
3. **Authentication → URL Configuration:**
   - Site URL: `https://brew-bean-coffee.pages.dev`
   - Redirect URLs: `https://brew-bean-coffee.pages.dev/**`, `http://localhost:5173/**`
4. Enable email confirmations (recommended).
5. Storage bucket `product-images` is created by `004_storage.sql`.

See also [docs/SUPABASE_AUTH.md](docs/SUPABASE_AUTH.md).

## Stripe setup (test mode)

1. Create products are **not** required in Stripe — prices come from your database.
2. Use **test** keys (`sk_test_...`).
3. Create webhook endpoint: `https://<your-worker>.workers.dev/v1/webhooks/stripe`
4. Events: `checkout.session.completed`
5. Copy signing secret to `STRIPE_WEBHOOK_SECRET`.

## Admin creation

1. Sign up a user on the site.
2. Set `ADMIN_SETUP_SECRET` on the Worker.
3. Call once:

```bash
curl -X POST https://<worker>/v1/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","secret":"YOUR_ADMIN_SETUP_SECRET"}'
```

Or in SQL: `update profiles set role = 'admin' where email = 'you@example.com';`

## Environment variables

See [.env.example](.env.example) — public `VITE_*` vars vs private Worker secrets.

## Testing

```bash
npm test
cd worker && npm test
npm run lint
cd worker && npm run lint
npm run build
```

## Deployment

GitHub Actions:

- **CI** — lint, test, build on PR/push
- **Deploy** — after CI passes on `main`, deploys Pages + Worker

Required repository secrets: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`, `CLOUDFLARE_*`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*`, `CLOUDFLARE_PAGES_PROJECT_NAME`.

## Routes

| Page | Path |
|------|------|
| Home | `/` |
| Menu | `/catalog` |
| Product | `/product/:slug` |
| Cart | `/cart` |
| Checkout | `/checkout` |
| Account | `/account` |
| Admin | `/admin` |
| Contact | `/contact` |

## Troubleshooting

- **CORS errors** — ensure `ALLOWED_ORIGINS` includes your Pages URL.
- **Webhook not updating orders** — verify `STRIPE_WEBHOOK_SECRET` and endpoint URL.
- **Empty menu** — run migrations + seed; check Worker `SUPABASE_*` secrets.
- **Auth redirect to localhost** — update Supabase redirect allowlist (see docs).
