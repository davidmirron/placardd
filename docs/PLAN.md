# Placard — product & technical plan

Placard is a two-sided marketplace for **on-body and physical sponsorships**. Anyone with a physical surface that will be seen — an outfit at a conference, a race kit, a car, a bag, a laptop lid, a booth wall — lists it, draws the exact ad zones on their photos, and lets brands bid on or buy those zones. After the event, the seller uploads proof, the brand confirms, and the seller gets paid minus the platform commission.

The inspiration is the Token2049 dress auction: 13 logo spots, $350 starting bid, doubling on every outbid, plus social posts and a website listing. The thesis is that the old sponsorship world (agents, athletes, teams) already exists; the missing product is a **self-serve marketplace for everyone else**.

This document covers: what the MVP is, how it should work, what it is built on, and what is intentionally deferred.

> **Launch decision (Sep 2026): fixed price only.** Auctions are fully built (bid rules, anti-sniping, settlement) but switched off behind `NEXT_PUBLIC_AUCTIONS_ENABLED` and are not part of the product. Reason: a bid is a promise, not a payment — with no card on file a brand can win every auction and never pay. Every spot has one price, "Buy now" goes straight to Stripe/test checkout, and the spot is held for one hour while the brand pays. The "bidding deadline" is an optional "available until" date. The sections below describe the full design including auctions; anything about bidding applies only when the flag is on.
>
> **Trust mechanics added pre-launch:** unread-message indicators; a 7-day proof review window after which payouts auto-release; a real dispute loop (flag → fix & resubmit / refund / accept / escalate to support); creator-initiated full refunds through Stripe; double-blind reviews (sealed until both posted, or 14 days); the platform fee is shown to creators as net earnings and never to brands.

---

## 1. Who it is for

| Side | Who | Job to be done |
|---|---|---|
| Sellers ("Creators") | Conference speakers, athletes, streamers, students, festival-goers, drivers, anyone with an audience or a crowd | Turn a surface I already carry into money, with zero sales effort |
| Buyers ("Brands") | Startups, DTC brands, crypto projects, agencies, local businesses | Buy hyper-targeted, high-buzz visibility in a specific room or feed without negotiating a sponsorship deal |

The first wedge is **events** (conferences, races, festivals, launches). Events have a hard date, a known audience, and built-in social amplification — the same ingredients that made the original post go viral.

## 2. Core loop

1. Seller creates a listing for an event or time window: title, category (outfit, vehicle, accessory, space, other), location, event date, bidding deadline, expected reach (in-person + social), and what is included (printing, social posts, tagging).
2. Seller uploads photos (front / back / side / detail).
3. Seller draws **ad zones** on the photos — rectangles with a label, size hint, sale type, and pricing rules.
4. Listing goes live. Brands browse, filter, open the listing, see zones overlaid on the photos.
5. Brands bid (auction) or buy instantly (fixed price). Auctions support two rules:
   - **Increment**: each bid must exceed the current bid by a minimum step.
   - **Doubling**: each bid must be at least 2x the current bid (the Token2049 rule). Fast, dramatic, and viral by design.
   - Anti-sniping: a bid in the last 5 minutes extends the auction by 5 minutes.
6. When the auction ends, the highest bidder wins and an **order** is created. Buy-now creates the order immediately.
7. Brand pays. Platform holds the money and records its commission (default 15%). The brand sees only the price; the creator sees their net earnings.
8. Brand uploads logo assets and instructions inside the order.
9. After the event, seller uploads **proof** (photos / video).
10. Brand approves proof → order completes → seller payout is released. The brand has 7 days; if they don't respond the payout releases automatically. If something is wrong, the brand flags an issue: the payout pauses, the creator can fix and resubmit or refund in full, the brand can accept the fix, and either side can escalate to support.
11. Both parties leave a review. Reviews are sealed until both are in (or 14 days pass), then published together. Reviews and completed-order counts build trust on profiles.

Messaging runs alongside the loop so brands can ask "can you fit a 10cm logo on the left sleeve?" before bidding.

## 3. MVP scope (what is built now)

**Accounts & profiles**
- Email + password signup, choose role: Creator or Brand.
- Public profile: avatar, bio, location, social links, follower count, rating, completed orders.

**Listings**
- Create → upload photos → draw zones → publish. Draft state until published.
- Zone editor: click-drag rectangles on the photo, normalized coordinates (device independent), label, description, sale type (auction / buy now), starting price, bid rule (increment / doubling), optional buy-now price on auctions.
- Listing states: `draft`, `active`, `ended`, `cancelled`.

**Discovery**
- Browse grid with text search, category, location, price range, minimum reach, and sort (ending soon, newest, price).
- Listing detail: photo gallery with numbered zone overlays, spot cards with live price, bid history, countdown, seller card, included deliverables, message button.

**Auctions & orders**
- Bid validation server-side (rule, minimum, deadline, not your own listing, only Brand role).
- Lazy settlement: any read of a listing/dashboard settles ended auctions (no cron dependency). A `/api/cron/settle` endpoint exists for a scheduler later.
- Order states: `pending_payment` → `paid` → `proof_submitted` → `completed`, plus `disputed` and `cancelled`.

**Payments**
- Payment provider abstraction. If `STRIPE_SECRET_KEY` is set, Stripe Checkout is used and a webhook marks orders paid. If not, a built-in **test checkout** page simulates payment so the whole flow is testable locally.
- Commission percent is configurable (`PLATFORM_FEE_PERCENT`). Every order stores gross, fee, and seller net.

**Fulfilment & trust**
- Proof upload (images/video) on the order, brand approval or dispute.
- Reviews (1–5 stars + text) on completed orders, shown on profiles.
- Direct messaging (threads between two users, optionally attached to a listing).

**Dashboards**
- Creator: my listings, live bids, orders that need proof, earnings.
- Brand: my bids (winning / outbid), orders to pay, orders awaiting proof, spend.

## 4. Architecture

```
Next.js 16 (App Router, TypeScript, Tailwind v4, shadcn/ui)
├─ src/app                 routes (server components + server actions + route handlers)
├─ src/components          UI (zone editor, zone overlay, bid panel, listing card, ...)
├─ src/lib
│  ├─ db/                  Drizzle ORM schema + SQLite (libsql) client
│  ├─ auth.ts              password hashing, signed session cookie, guards
│  ├─ auctions.ts          bid rules, validation, settlement
│  ├─ payments.ts          provider abstraction (mock | stripe)
│  ├─ storage.ts           file storage abstraction (local disk now, S3/R2 later)
│  └─ actions/             server actions grouped by domain
└─ data/                   SQLite database + uploads (gitignored)
```

**Why this stack**
- One codebase, one deploy, one language. A marketer-led team can move fast in it.
- Server actions remove the need to design and maintain a separate REST API for the MVP.
- SQLite via libsql means zero infrastructure to run locally. Drizzle keeps the schema portable — swapping to Postgres (Neon/Supabase/Turso) is a config change and a migration, not a rewrite.
- shadcn/ui gives production-quality primitives without a design system project.
- Local file storage keeps the MVP self-contained; `storage.ts` is the single swap point for S3 / Cloudflare R2 / UploadThing.
- Stripe is the right long-term rail (Connect Express accounts, destination charges with `application_fee_amount`), so the code is shaped around it from day one even though local testing uses the mock provider.

**Data model (simplified)**

```
users ─┬─< listings ─< photos ─< zones ─< bids
       │                        └──────< orders ─< proofs
       │                                        └─< reviews
       ├─< conversations >─ messages
```

Money is stored as integer cents in USD. Zone coordinates are stored as fractions (0–1) of the photo so they render correctly at any size.

## 5. Key product decisions

- **Zones are the product, not listings.** A listing is a container; brands buy zones. This is what makes the "13 spots on one dress" model work and what lets many brands share one surface.
- **Doubling auctions are a feature, not a gimmick.** They make outbidding a visible, shareable event. Every listing page shows the rule up front.
- **Proof is mandatory for payout.** This is the trust mechanism that makes brands willing to pay strangers. Sellers know it before listing.
- **Platform holds funds until proof.** Escrow-like flow reduces the fraud surface on both sides.
- **Reach is self-reported for now.** It is a filter and a signal, not a guarantee. Verified reach (social API connections, event attendance data) is a later trust layer.
- **Roles are explicit.** A user is a Creator or a Brand. It keeps the UI focused. Switching or dual roles is a settings feature later.

## 6. Deferred (post-validation roadmap)

Ordered roughly by expected impact once the concept is validated:

1. **Stripe Connect payouts** — Express onboarding for sellers, automatic transfers on proof approval, refunds on disputes.
2. **Media pipeline** — S3/R2 storage, image resizing, video transcoding, logo asset delivery to sellers.
3. **Notifications** — email (Resend) for outbid, won, paid, proof requested, proof approved; in-app inbox.
4. **Social login & verified reach** — X / Instagram / TikTok OAuth to pull follower counts; event organiser partnerships for attendance data.
5. **Shareable auction pages & embeds** — OG images per zone, "I just got outbid" share cards, a live bid ticker. This is the growth engine.
6. **Polygon zones and multi-photo zones** — same spot visible in front and side photos.
7. **Brand tools** — saved searches, alerts for new listings matching criteria, campaign grouping across many sellers at one event.
8. **Event pages** — aggregate all sellers at Token2049 / a marathon / a festival.
9. **Disputes & moderation** — admin console, content policy, refund tooling.
10. **Mobile capture** — camera-first listing creation on phones.
11. **Scale infrastructure** — Postgres, background jobs (auction settlement, reminders), rate limiting, observability.

## 7. Business model

- Commission on every completed order (default 15%, configurable). Charged to the seller side of the transaction so the brand sees the bid price as the price.
- Later: featured listings, brand subscriptions for alerts and analytics, event-organiser packages.

## 8. Risks and how the MVP addresses them

| Risk | Mitigation in MVP |
|---|---|
| Sellers list but never deliver | Funds held until proof approved; reviews; completed-order count on profile |
| Brands bid and never pay | Order expires if unpaid; unpaid win is visible on brand's profile (future: pre-authorised payment on bid) |
| Low liquidity (empty marketplace) | Event wedge concentrates supply and demand; seed data shows the format; share-first design |
| Perceived as tacky | Curation via clean design, quality photos, real reach numbers; the product feels like a creator tool, not a billboard exchange |
| Payment/legal complexity | Stripe abstraction, USD only, no payouts automation until Connect is wired |
