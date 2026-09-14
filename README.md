# Placard

**Sell the space you already carry.**

Placard is a two-sided marketplace for on-body and physical sponsorships. Creators (speakers, athletes, drivers, anyone heading somewhere crowded) photograph their outfit, car, bag or booth, draw the ad spots directly on the photos, and put a price on each one. Brands browse, buy at checkout, and approve proof of delivery before the creator gets paid.

The product plan, architecture decisions and roadmap live in [`docs/PLAN.md`](docs/PLAN.md).

## What's in the MVP

- Creator and brand accounts (email + password, signed session cookie)
- Listing builder: details → photo upload → draw ad spots with a drag-to-draw editor → set a price per spot → publish
- **Fixed price, pay at checkout.** "Buy now" sends the brand straight to Stripe Checkout (or the built-in test checkout). The spot is held for one hour while they pay; unpaid holds are released automatically
- Optional "available until" date per listing (defaults to the end of the event day)
- Browse with search, category, location, price and reach filters
- Listing page with numbered zone overlays, countdowns, seller card
- Orders: 15% platform commission, brand creative upload, seller proof upload, approval or dispute
- Reviews on completed orders, public profiles, direct messaging, role-based dashboards
- Seed data modelled on the Token2049 dress so the marketplace is never empty
- Auction engine (minimum-increment and doubling bids, anti-sniping, lazy settlement, 48h payment window) is built and tested but **switched off** via `NEXT_PUBLIC_AUCTIONS_ENABLED`. See "Why no auctions at launch" below

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
| Creator | `vanessa@demo.placard.app` | Owns the Token2049 dress listing (2 of 7 spots sold) |
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

- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` switch payments from the built-in test checkout to Stripe Checkout (`/api/webhooks/stripe` handles `checkout.session.completed`). Without them, the test checkout page marks orders paid instantly.
- `PLATFORM_FEE_PERCENT` sets the commission (default 15).
- `NEXT_PUBLIC_AUCTIONS_ENABLED=true` turns the auction engine back on (sale-type picker in the zone editor, bid controls on listings, bidding deadline required, 48h payment window for winners). Off by default.
- `DATABASE_URL` accepts a local `file:` path or a Turso/libsql URL.
- `SEED_DEMO_DATA=false` boots with an empty database.
- `CRON_SECRET` protects `/api/cron/settle`, which a scheduler can call to release unpaid holds and close listings promptly. Settlement also happens lazily whenever listings are read, so the app works without it.

### Why no auctions at launch

A bid is a promise, not a payment. Without a card on file, a brand can win every auction on the site and never pay, and the only cost to them is losing the spot. Fixed price with immediate checkout removes that: money moves before the spot is taken. The doubling auction from the original Token2049 thread is kept in the codebase and comes back as a feature for brands with a verified card on file — that is when it becomes a viral mechanic instead of a troll magnet.

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

## What's next

See the roadmap in `docs/PLAN.md`: Stripe Connect payouts, S3/R2 media storage, email notifications, verified social reach (link X/Instagram), auctions for brands with a card on file, event pages, and an admin console for disputes.
