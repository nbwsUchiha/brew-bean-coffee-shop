# Brew & Bean Coffee — Repository Audit

**Date:** 2026-06-16  
**Live site:** https://brew-bean-coffee.pages.dev/

## Current technology stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite 5, React 18, React Router 6, Tailwind CSS 3 |
| API | Cloudflare Worker (`coffee-shop-api`) at `/v1/*` |
| Database | Supabase Postgres (minimal schema) |
| Auth | Supabase Auth (client-only sign-in/sign-up) |
| Payments | Stripe Checkout (test mode capable) |
| Email | Resend (optional, order confirmation only) |
| Deploy | Cloudflare Pages + Workers via GitHub Actions |
| CI | TypeScript check + build (no tests) |

## Existing working features

- **Homepage** with live stats from API (`/v1/stats`)
- **Menu/catalog** loaded from Supabase via Worker (`/v1/catalog`)
- **Single-item checkout** → Stripe Checkout session (`/v1/checkout/session`)
- **Stripe webhook** handler updates order to `paid` (`/v1/webhooks/stripe`)
- **Success page** fetches order by Stripe session ID
- **Cancel page** for abandoned checkout
- **Basic Supabase auth** (sign in, sign up, sign out)
- **Order confirmation email** via Resend (when configured)
- **Brew & Bean branding**, responsive layout, drink images
- **Cloudflare deploy workflow** (manual `workflow_dispatch`)

## Frontend-only features

- Drink images mapped by hardcoded name in `src/data/drinkImages.ts` (not from DB/storage)
- Auth has no forgot-password, reset-password, email-verification UX, or profile
- “Add to order” links directly to checkout (no cart)
- Login page shows account info only — no order history or profile editing
- Footer links missing (no About, Contact, legal pages)
- No product detail pages, search, filter, or sort
- No admin UI
- No SEO per-page metadata, sitemap, or robots.txt
- No 404 page

## Missing backend features

- Full product schema (slug, categories, stock, sale price, images, featured, origin, roast)
- Shopping cart with server-side price validation
- Multi-item checkout
- User profiles table and RLS
- Order items, payments, status history, addresses
- User order history API
- Admin API with server-side role checks
- Contact form backend
- Stripe webhook **signature verification** (critical)
- Webhook idempotency / duplicate order prevention
- Inventory reduction on payment
- Rate limiting
- Request validation library (Zod)
- CORS restricted to known origins
- Auth token verification on protected API routes
- Supabase Storage for product images
- Transactional emails for status changes, contact ack

## Security problems

| Issue | Severity |
|-------|----------|
| Stripe webhook accepts JSON without signature verification | **Critical** |
| CORS `Access-Control-Allow-Origin: *` | High |
| No RLS policies on orders (only catalog read policy) | High |
| Service role used for all DB access (OK for Worker, but no user-scoped policies) | Medium |
| Orders created before payment confirmed (status `pending` without cleanup) | Medium |
| No rate limiting on checkout, contact, or auth-adjacent endpoints | Medium |
| Deploy workflow does not run tests; deploy is manual-only | Medium |
| No admin authorization anywhere | High |
| Frontend could theoretically send manipulated prices (mitigated partially — Worker loads price from DB, but only single item) | Medium |

## Database problems

- `catalog_items` is a minimal 5-column table — not a product system
- `orders` references single `item_id`, no line items, tax, shipping, user_id, order number
- No categories, profiles, payments, addresses, contact submissions, webhook events
- No indexes on common query fields (slug, user_id, order status)
- No `updated_at` triggers
- Seed data has only 3 products with no categories or stock
- Migration `002_order_paid_at.sql` exists but full order model incomplete

## Deployment problems

- Deploy workflow gated on `workflow_dispatch` only — pushes to `main` do not auto-deploy
- CI does not run worker build, tests, or lint worker TypeScript
- No test job in CI pipeline
- `STRIPE_SUCCESS_URL` hardcoded in `wrangler.toml` (OK for prod, needs env flexibility)

## Recommended implementation order

1. **Database** — Full schema migration, RLS, storage bucket, seed data from current menu
2. **Worker security** — Zod validation, Stripe signature verification, CORS, auth middleware, rate limits
3. **Worker APIs** — Products, cart checkout, orders, contact, admin, webhooks with idempotency + inventory
4. **Frontend core** — Cart context, product pages, catalog search/filter, expanded auth + profile
5. **Frontend pages** — About, Contact, FAQ, legal, shipping, 404, account orders
6. **Admin dashboard** — Server-protected CRUD for products, categories, orders
7. **SEO** — PageMeta, sitemap, robots.txt, structured data
8. **Tests + CI** — Vitest unit/integration tests, update GitHub Actions
9. **Documentation** — README, IMPLEMENTATION_STATUS.md, env examples
