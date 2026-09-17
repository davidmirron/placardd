# Placard

**Sell the space you already carry.**

Placard is a two-sided marketplace for on-body and physical sponsorships. Creators (speakers, athletes, drivers, anyone heading somewhere crowded) photograph their outfit, car, bag or booth, draw the ad spots directly on the photos, and put a price on each one. Brands browse, buy at checkout, and approve proof of delivery before the creator gets paid.

The product plan, architecture decisions and roadmap live in [`docs/PLAN.md`](docs/PLAN.md).

## What's in the MVP

- Creator and brand accounts (email + password, signed session cookie)
- Listing builder: details → photo upload → draw ad spots with a drag-to-draw editor → set a price per spot → publish
- **Fixed price, pay at checkout.** "Buy now" sends the brand straight to Stripe Checkout (or the built-in test checkout). The spot is held for one hour while they pay; unpaid holds are released automatically
- Optional "available until" date per listing (defaults to the end of the event day)
- Browse with search, event type, ad surface, location, price and reach filters
- Listing page with numbered zone overlays, countdowns, seller card
- Orders: brand creative upload, seller proof upload, approval, issue flagging, creator-initiated refunds (Stripe or test mode). Unanswered proof is auto-approved after 7 days so payouts can't be stalled by silence
- Placard's commission (default 15%) is recorded on every order. Brands only ever see the price; creators see their net earnings when they set a price and on the order — it is never shown as a fee line
- Double-blind reviews on completed orders (revealed when both sides have posted, or after 14 days), public profiles, direct messaging with unread badges, role-based dashboards
- Seed data so the marketplace is never empty (development only by default)
- Auction engine (minimum-increment and doubling bids, anti-sniping, lazy settlement, 48h payment window) exists in the codebase but is **switched off** via `NEXT_PUBLIC_AUCTIONS_ENABLED` and is not part of the product

## Run it locally

Requirements: Node 20+, pnpm.

```bash
pnpm install
pnpm dev
```

Open [http://127.0.0.1:4721](http://127.0.0.1:4721).

On first boot the app creates a SQLite database at `data/placard.db`, applies migrations and seeds demo data. Uploaded files go to `data/uploads/`. Both are gitignored.

### Demo accounts

All demo accounts use the password `password123`.

| Role | Email | Notes |
|---|---|---|
| Creator | `vanessa@demo.placard.app` | Owns the SXSW dress listing (2 of 7 spots sold) |
| Creator | `marcus@demo.placard.app` | Marathon kit that comes off sale in ~3 hours |
| Creator | `sofia@demo.placard.app` | Car listing with a paid order waiting for proof |
| Creator | `dev@demo.placard.app` | Has a completed order and reviews |
| Brand | `kite@demo.placard.app` | Bought the dress front chest and a car panel |
| Brand | `nova@demo.placard.app` | One completed deal; a good account to test buying with |
| Brand | `pulse@demo.placard.app` | Bought the marathon chest strip and the dress upper back |

### Useful scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the dev server on port 4721 |
| `pnpm build` / `pnpm start` | Production build and serve |
| `pnpm lint` / `pnpm typecheck` | ESLint and TypeScript checks |
| `pnpm db:reset` | Delete the local database and re-seed demo data |
| `pnpm db:generate` | Generate a new migration after editing `src/lib/db/schema.ts` |
| `pnpm db:studio` | Open Drizzle Studio to inspect the database |

### Configuration

Copy `.env.example` to `.env.local` and adjust. Everything is optional for local development.

- `AUTH_SECRET` signs session cookies. **Required in production** — the app refuses to start without it. Generate one with `openssl rand -base64 32`.
- `APP_URL` is the public URL, used for Stripe redirects.
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` switch payments from the built-in test checkout to Stripe Checkout (`/api/webhooks/stripe` handles `checkout.session.completed`). Refunds go through Stripe when configured. Without them, the test checkout page marks orders paid instantly.
- `PLATFORM_FEE_PERCENT` sets the commission (default 15).
- `DATABASE_URL` accepts a local `file:` path or a Turso/libsql URL.
- `SEED_DEMO_DATA` controls the demo accounts. Seeding is on in development and **off in production** unless set to `true` — the demo passwords are public.
- `CRON_SECRET` protects `/api/cron/settle`, which a scheduler should call every few minutes to release unpaid holds, auto-approve unanswered proof, reveal sealed reviews and close listings on time. Settlement also happens lazily whenever listings are read, so the app works without it.
- `NEXT_PUBLIC_SUPPORT_EMAIL` is where "Escalate to Placard" on a disputed order sends people.
- `NEXT_PUBLIC_AUCTIONS_ENABLED=true` turns the dormant auction engine on. Leave it unset.

### How money moves

Brands pay the listed price at checkout and Placard holds it. The creator uploads proof after the event; the brand has 7 days to approve or flag an issue, after which the payout is released automatically. A flagged issue pauses the payout: the creator can resubmit proof or refund the brand in full, the brand can accept the fix, and either side can escalate to support. Placard's commission is recorded on each order and shown to creators as their net earnings — brands never see a fee.

### Why fixed price

A bid is a promise, not a payment. Without a card on file, a brand can win every auction on the site and never pay, and the only cost to them is losing the spot. Fixed price with immediate checkout removes that: money moves before the spot is taken.

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS v4 · shadcn/ui · Drizzle ORM · SQLite (libsql) · Stripe · Zod

## Project layout

```
src/app/            routes: landing, listings, sell flow, dashboard, orders, checkout, messages, profiles, settings, API
src/components/     UI: zone editor, zone overlay, listing card, uploader, countdown, header, forms
src/lib/db/         Drizzle schema, client, migrations runner, seed
src/lib/actions/    server actions by domain (auth, listings, bids, orders, messages, profile)
src/lib/auctions.ts buy-now, bid rules (flagged off), hold/payment windows, settlement
src/lib/payments.ts payment provider abstraction (stripe | mock)
src/lib/storage.ts  file storage abstraction (local disk)
src/lib/queries.ts  read models for pages
drizzle/            SQL migrations
docs/PLAN.md        product and technical plan
```

## Before launch

Things that must be true on the production box:

1. `AUTH_SECRET`, `APP_URL`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` set; `SEED_DEMO_DATA` unset or `false`.
2. `data/` (SQLite + uploads) on a persistent disk, or `DATABASE_URL` pointed at Turso and `UPLOAD_DIR` at a mounted volume. A serverless deploy with ephemeral disk will lose every upload.
3. A scheduler hitting `GET /api/cron/settle` with `Authorization: Bearer $CRON_SECRET`.
4. A payout process. "Payout released" is a status: the money is in the platform's Stripe balance until Stripe Connect transfers are wired (see roadmap). Until then payouts are manual.

## What's next

See the roadmap in `docs/PLAN.md`: Stripe Connect payouts, S3/R2 media storage, email notifications, verified social reach (link X/Instagram), event pages, and an admin console for disputes.
