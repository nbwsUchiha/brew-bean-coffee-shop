# Brew & Bean Coffee

Production-ready full-stack coffee ecommerce: order online for pickup or local delivery.

**Live site:** https://brew-bean-coffee.pages.dev  
**API:** https://coffee-shop-api.brewbean.workers.dev

## Technology stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite, React 18, React Router, Tailwind CSS |
| API | Cloudflare Worker (`coffee-shop-api`) |
| Database & auth | Supabase Postgres + Auth |
| Payments | Stripe Checkout (test mode) |
| Email | Resend (optional) |
| Deploy | Cloudflare Pages + Workers, GitHub Actions |
| E2E tests | Playwright |

## Architecture

```
Browser (Pages) ──► Worker /v1/* ──► Supabase (service role)
                 └──► Supabase Auth (anon key, client-side)
Stripe ──webhook──► Worker ──► orders, inventory, emails
```

## Database migrations

Run in Supabase SQL Editor, in order:

1. `migrations/001_schema.sql`
2. `migrations/002_order_paid_at.sql`
3. `migrations/003_ecommerce_schema.sql`
4. `migrations/004_storage.sql`
5. `migrations/seed.sql`
6. `migrations/005_webhook_inventory.sql` — webhook status, atomic inventory reduction
7. `migrations/006_guest_orders_refunds.sql` — guest order linking, refund stock restore

## Stripe webhooks

Endpoint: `https://coffee-shop-api.brewbean.workers.dev/v1/webhooks/stripe`

| Event | Behavior |
|-------|----------|
| `checkout.session.completed` | Mark paid, reduce inventory, send confirmation email |
| `checkout.session.expired` | Mark checkout failed for pending orders |
| `payment_intent.payment_failed` | Mark payment failed |
| `charge.refunded` | Mark refunded, restore inventory once |

## Guest orders

Guest checkout works without an account. After payment, the success page explains that the order is not linked to an account. When the customer creates an account with the **same verified email**, `POST /v1/orders/link-guest` securely attaches prior guest orders. Orders cannot be claimed by email alone.

## Success page polling

`/success?session_id=...` polls `GET /v1/orders/by-session` every 2 seconds (up to 60s) until the webhook marks the order paid, failed, or refunded. Shows a processing spinner and retry button on timeout.

## Resend email (optional)

Configure on the Worker:

- `RESEND_API_KEY`
- `RESEND_FROM` (e.g. `Brew & Bean <orders@yourdomain.com>`)

Sends when configured: order confirmation, order status updates, refund notice, contact acknowledgement. The app works without email.

## Testing

```bash
npm run lint && npm test && npm run build
cd worker && npm run lint && npm test && npm run dry-run
npm run test:e2e          # Playwright against production URLs by default
node scripts/test-signed-webhook.mjs
node scripts/check-db.mjs
node scripts/scan-bundle-secrets.mjs
```

## Deployment

GitHub Actions CI runs lint, unit tests, build, worker dry-run, bundle secret scan, and Playwright smoke tests. Deploy workflow publishes to the existing `brew-bean-coffee` Pages project and `coffee-shop-api` Worker after CI passes on `main`.

## Production URLs

| Resource | URL |
|----------|-----|
| Frontend | https://brew-bean-coffee.pages.dev |
| Worker API | https://coffee-shop-api.brewbean.workers.dev |
| Stripe webhook | `/v1/webhooks/stripe` on Worker URL |

## Known limitations

- Stock is validated at checkout, not reserved until payment
- Delivery uses a flat fee without zone validation
- Playwright login test requires a dedicated test account (not committed)
- Email delivery requires Resend configuration
