# Placard

**Sell the space you already carry.**

Placard is a two-sided marketplace for on-body and physical sponsorships. Creators (speakers, athletes, drivers, anyone heading somewhere crowded) photograph their outfit, car, bag or booth, draw the ad spots directly on the photos, and put them up for auction or fixed-price sale. Brands browse, bid, pay, and approve proof of delivery before the creator gets paid.

The product plan, architecture decisions and roadmap live in [`docs/PLAN.md`](docs/PLAN.md).

## What's in the MVP

- Creator and brand accounts (email + password, signed session cookie)
- Listing builder: details → photo upload → draw ad spots with a drag-to-draw editor → publish
- Per-spot pricing: auction with **minimum increment** or **doubling** bids, optional buy-now, or fixed price
- Auction engine: server-side validation, anti-sniping extension, lazy settlement (no cron needed), 48h payment window
- Browse with search, category, location, price and reach filters
- Listing page with numbered zone overlays, live countdowns, bid history, seller card
- Orders: payment (Stripe Checkout when configured, built-in test checkout otherwise), 15% platform commission, brand creative upload, seller proof upload, approval or dispute
- Reviews on completed orders, public profiles, direct messaging, role-based dashboards
- Seed data modelled on the Token2049 dress auction so the marketplace is never empty

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
| Creator | `vanessa@demo.placard.app` | Owns the Token2049 dress listing (doubling auctions with live bids) |
| Creator | `marcus@demo.placard.app` | Marathon kit ending in ~3 hours |
| Creator | `sofia@demo.placard.app` | Car listing with a paid order waiting for proof |
| Creator | `dev@demo.placard.app` | Has a completed order and reviews |
| Brand | `kite@demo.placard.app` | Leading bidder on the dress, has a paid order |
| Brand | `nova@demo.placard.app` | Outbid on several spots |
| Brand | `pulse@demo.placard.app` | Bidding on the marathon kit |

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

- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` switch payments from the built-in test checkout to Stripe Checkout (`/api/webhooks/stripe` handles `checkout.session.completed`). Without them, the test checkout page marks orders paid instantly.
- `PLATFORM_FEE_PERCENT` sets the commission (default 15).
- `DATABASE_URL` accepts a local `file:` path or a Turso/libsql URL.
- `SEED_DEMO_DATA=false` boots with an empty database.
- `CRON_SECRET` protects `/api/cron/settle`, which a scheduler can call to settle auctions promptly. Settlement also happens lazily whenever listings are read, so the app works without it.

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS v4 · shadcn/ui · Drizzle ORM · SQLite (libsql) · Stripe · Zod

## Project layout

```
src/app/            routes: landing, listings, sell flow, dashboard, orders, checkout, messages, profiles, settings, API
src/components/     UI: zone editor, zone overlay, listing card, uploader, countdown, header, forms
src/lib/db/         Drizzle schema, client, migrations runner, seed
src/lib/actions/    server actions by domain (auth, listings, bids, orders, messages, profile)
src/lib/auctions.ts bid rules, validation, settlement
src/lib/payments.ts payment provider abstraction (stripe | mock)
src/lib/storage.ts  file storage abstraction (local disk)
src/lib/queries.ts  read models for pages
drizzle/            SQL migrations
docs/PLAN.md        product and technical plan
```

## What's next

See the roadmap in `docs/PLAN.md`: Stripe Connect payouts, S3/R2 media storage, email notifications, verified social reach, shareable auction cards, event pages, and an admin console for disputes.
