# Implementation Status

## Implemented

### Database
- Full product schema (categories, products, images, stock, featured, origin, roast)
- User profiles with roles (`customer` / `admin`)
- Orders, order items, payments, status history, addresses
- Contact submissions, webhook idempotency, rate limits
- RLS policies on sensitive tables
- Storage bucket policies for product images
- Seed data (6 products, 3 categories)

### Worker API
- Product catalog with search, filter, sort
- Cart quote + checkout (server-side pricing)
- Stripe Checkout session creation
- Webhook signature verification + idempotency + inventory reduction
- User profile CRUD (authenticated)
- Order history (authenticated)
- Contact form with rate limiting
- Admin: products, orders, stats, contact inbox
- Admin setup endpoint (secret-gated)
- Zod validation, restricted CORS, rate limiting

### Frontend
- Homepage, catalog, product detail, cart, checkout
- Supabase auth: sign up/in/out, forgot/reset password, email verification flow
- Account profile + order history
- Admin dashboard (server-protected)
- About, Contact, FAQ, Shipping, Privacy, Terms, Refunds, 404
- SEO: per-page meta, Open Graph, canonical URLs, sitemap, robots.txt
- Product structured data
- Loading, empty, and error states
- Mobile-responsive nav, skip link, accessible forms

### DevOps
- CI: lint, test, build (frontend + worker)
- Deploy after CI on `main`
- Updated `.env.example` and worker `.dev.vars.example`

## Tested (automated)

| Suite | Result |
|-------|--------|
| `npm run lint` (frontend) | Pass |
| `npm test` (frontend, 4 tests) | Pass |
| `npm run build` | Pass |
| `worker npm run lint` | Pass |
| `worker npm test` (6 tests) | Pass |

Tests cover: pricing, cart validation, checkout payload schema, Stripe webhook signature rejection, checkout flow mocks.

## Requires manual setup

1. **Supabase** — create project, run all migrations, configure auth URLs
2. **Stripe** — test keys, webhook endpoint pointing to Worker
3. **Cloudflare** — Pages project, Worker deploy, GitHub secrets
4. **Resend** (optional) — order + contact acknowledgement emails
5. **Admin** — promote first user via `/v1/admin/setup` or SQL
6. **Product images in Storage** — optional; seed uses `/drinks/*.jpg` on Pages

## Environment variables

See `.env.example` and `worker/.dev.vars.example`.

## Known limitations

- Guest orders are not auto-linked to account by email after signup
- Admin product image upload UI uses URL field; Supabase Storage upload can be done via dashboard or extended API
- Delivery is a flat fee — no address geocoding or zone validation
- E2E browser test with live Stripe not run in CI (mock/unit tests only)
- `workflow_run` deploy requires GitHub Actions enabled for the repo

## Production verification checklist

After configuring credentials:

- [ ] Homepage stats load from API
- [ ] Catalog shows DB products
- [ ] Add to cart → checkout → Stripe test payment
- [ ] Webhook marks order paid and reduces stock
- [ ] Success page shows order details
- [ ] Account shows order history (when logged in at checkout)
- [ ] Contact form stores submission
- [ ] Admin dashboard accessible only to admin role
- [ ] No secrets in `dist/assets/*.js` bundle
