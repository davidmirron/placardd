import { and, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, type Db } from "@/lib/db";
import { bids, listings, orders, reviews, zones, HOLDING_ORDER_STATUSES, type Zone } from "@/lib/db/schema";
import {
  ANTI_SNIPE_WINDOW_MS,
  AUCTION_PAYMENT_WINDOW_MS,
  AUCTIONS_ENABLED,
  BUY_NOW_HOLD_MS,
  PROOF_REVIEW_WINDOW_MS,
  REVIEW_REVEAL_WINDOW_MS,
} from "@/lib/constants";
import { splitAmount } from "@/lib/money";
import { allOrderZoneIds, parseAdditionalZoneIds, serializeAdditionalZoneIds } from "@/lib/order-spots";

export class AuctionError extends Error {}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Smallest bid that will be accepted for a zone right now. */
export function minimumNextBid(zone: Pick<Zone, "currentBidCents" | "startingPriceCents" | "bidRule" | "minIncrementCents">) {
  if (zone.currentBidCents == null) return zone.startingPriceCents;
  if (zone.bidRule === "doubling") return zone.currentBidCents * 2;
  return zone.currentBidCents + zone.minIncrementCents;
}

/** Price a brand pays to take the zone immediately, or null if buy-now is not offered. */
export function buyNowPrice(zone: Pick<Zone, "saleType" | "buyNowPriceCents" | "startingPriceCents" | "currentBidCents">) {
  if (zone.saleType === "buy_now") return zone.startingPriceCents;
  // Auctions off: a spot configured as an auction is sold outright at its buy-now price, or its floor.
  if (!AUCTIONS_ENABLED) return zone.buyNowPriceCents ?? zone.startingPriceCents;
  if (zone.buyNowPriceCents == null) return null;
  // Once bidding passes the buy-now price the instant option disappears.
  if (zone.currentBidCents != null && zone.currentBidCents >= zone.buyNowPriceCents) return null;
  return zone.buyNowPriceCents;
}

export function isZoneLive(zone: Pick<Zone, "status" | "endsAt">, now = Date.now()) {
  return zone.status === "open" && zone.endsAt.getTime() > now;
}

async function claimZone(tx: Tx, zone: Zone, buyerId: string, amountCents: number) {
  await tx
    .update(zones)
    .set({ status: "sold", currentBidCents: amountCents, currentBidderId: buyerId })
    .where(eq(zones.id, zone.id));
}

async function createOrder(tx: Tx, zone: Zone, buyerId: string, amountCents: number, sellerId: string, claim: boolean) {
  const split = splitAmount(amountCents);
  const id = nanoid(14);
  await tx.insert(orders).values({
    id,
    zoneId: zone.id,
    listingId: zone.listingId,
    sellerId,
    buyerId,
    ...split,
    status: "pending_payment",
  });
  // Auction wins hold the spot because the winner is notified after the fact. Buy-now does not —
  // the spot stays on sale until payment clears.
  if (claim) await claimZone(tx, zone, buyerId, amountCents);
  return id;
}

async function addZonesToPendingOrder(
  tx: Tx,
  order: { id: string; zoneId: string; additionalZoneIds: string; amountCents: number },
  extra: Zone[],
) {
  const held = new Set(allOrderZoneIds(order));
  const fresh = extra.filter((z) => !held.has(z.id));
  if (fresh.length === 0) return { orderId: order.id, amountCents: order.amountCents };
  let added = 0;
  const addedIds: string[] = [];
  for (const zone of fresh) {
    const price = buyNowPrice(zone);
    if (price == null) throw new AuctionError("This spot doesn't offer instant purchase.");
    added += price;
    addedIds.push(zone.id);
  }
  const split = splitAmount(order.amountCents + added);
  await tx
    .update(orders)
    .set({
      ...split,
      additionalZoneIds: serializeAdditionalZoneIds([...parseAdditionalZoneIds(order.additionalZoneIds), ...addedIds]),
    })
    .where(eq(orders.id, order.id));
  return { orderId: order.id, amountCents: split.amountCents };
}

export async function placeBid(zoneId: string, bidderId: string, amountCents: number) {
  if (!AUCTIONS_ENABLED) throw new AuctionError("Bidding is not available right now. Spots are sold at a fixed price.");
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new AuctionError("Enter a valid bid amount.");

  return db.transaction(async (tx) => {
    const zone = await tx.query.zones.findFirst({
      where: eq(zones.id, zoneId),
      with: { listing: true },
    });
    if (!zone) throw new AuctionError("This spot no longer exists.");
    if (zone.listing.status !== "active") throw new AuctionError("This listing is not accepting bids.");
    if (zone.listing.sellerId === bidderId) throw new AuctionError("You can't bid on your own listing.");
    if (zone.saleType !== "auction") throw new AuctionError("This spot is buy-now only.");
    const now = Date.now();
    if (!isZoneLive(zone, now)) throw new AuctionError("Bidding on this spot has ended.");
    if (zone.currentBidderId === bidderId) throw new AuctionError("You're already the highest bidder.");

    const minimum = minimumNextBid(zone);
    if (amountCents < minimum) throw new AuctionError(`Your bid must be at least ${(minimum / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}.`);

    const instantPrice = buyNowPrice(zone);
    if (instantPrice != null && amountCents >= instantPrice) {
      // Bidding at or above the buy-now price simply takes the spot at the buy-now price.
      await tx.insert(bids).values({ id: nanoid(14), zoneId, bidderId, amountCents: instantPrice });
      await tx.update(zones).set({ bidCount: sql`${zones.bidCount} + 1` }).where(eq(zones.id, zoneId));
      const orderId = await createOrder(tx, zone, bidderId, instantPrice, zone.listing.sellerId, true);
      return { kind: "won" as const, orderId, amountCents: instantPrice };
    }

    const remaining = zone.endsAt.getTime() - now;
    const endsAt = remaining < ANTI_SNIPE_WINDOW_MS ? new Date(now + ANTI_SNIPE_WINDOW_MS) : zone.endsAt;

    await tx.insert(bids).values({ id: nanoid(14), zoneId, bidderId, amountCents });
    await tx
      .update(zones)
      .set({
        currentBidCents: amountCents,
        currentBidderId: bidderId,
        bidCount: sql`${zones.bidCount} + 1`,
        endsAt,
      })
      .where(eq(zones.id, zoneId));

    return { kind: "leading" as const, amountCents, extended: endsAt !== zone.endsAt, endsAt };
  });
}

export async function buyNow(zoneIds: string[], buyerId: string) {
  const ids = [...new Set(zoneIds.filter(Boolean))];
  if (ids.length === 0) throw new AuctionError("Pick at least one spot.");

  return db.transaction(async (tx) => {
    const picked = await tx.query.zones.findMany({
      where: inArray(zones.id, ids),
      with: { listing: true },
    });
    const byId = new Map(picked.map((z) => [z.id, z]));
    const ordered = ids.map((id) => byId.get(id));
    if (ordered.some((z) => !z)) throw new AuctionError("A spot no longer exists.");
    const spots = ordered as typeof picked;

    const listingId = spots[0].listingId;
    for (const zone of spots) {
      if (zone.listingId !== listingId) throw new AuctionError("Spots have to be on the same listing.");
      if (zone.listing.status !== "active") throw new AuctionError("This listing is not accepting orders.");
      if (zone.listing.sellerId === buyerId) throw new AuctionError("You can't buy your own listing.");
      if (!isZoneLive(zone)) throw new AuctionError(`${zone.label} is no longer available.`);
      if (buyNowPrice(zone) == null) throw new AuctionError("This spot doesn't offer instant purchase.");
    }

    const pending = await tx.query.orders.findFirst({
      where: and(eq(orders.buyerId, buyerId), eq(orders.listingId, listingId), eq(orders.status, "pending_payment")),
    });
    if (pending) {
      const already = allOrderZoneIds(pending);
      const sameSpots = already.length === ids.length && ids.every((id) => already.includes(id));
      // Reuse the unpaid checkout only when it's exactly these spots. A new Buy now
      // (or a different bundle) replaces it so leftover checkouts don't get extra spots.
      if (sameSpots) return { orderId: pending.id, amountCents: pending.amountCents };
      await tx.update(orders).set({ status: "cancelled" }).where(eq(orders.id, pending.id));
    }

    const [first, ...rest] = spots;
    const price = buyNowPrice(first)!;
    const orderId = await createOrder(tx, first, buyerId, price, first.listing.sellerId, false);
    if (rest.length === 0) return { orderId, amountCents: price };
    const created = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!created) throw new AuctionError("Order was not created.");
    return addZonesToPendingOrder(tx, created, rest);
  });
}

/**
 * Settles anything that has expired. Called lazily from reads so no scheduler is required for the MVP;
 * the same function is exposed on /api/cron/settle for a real scheduler later.
 */
export async function settleExpired(listingId?: string) {
  const now = new Date();
  const summary = { ordersCreated: 0, zonesUnsold: 0, listingsEnded: 0, ordersExpired: 0, proofsAutoApproved: 0, reviewsRevealed: 0 };

  try {
    await db.transaction(async (tx) => {
    const expired = await tx.query.zones.findMany({
      where: and(eq(zones.status, "open"), lt(zones.endsAt, now), listingId ? eq(zones.listingId, listingId) : undefined),
      with: { listing: true },
    });

    for (const zone of expired) {
      if (zone.currentBidderId && zone.currentBidCents != null && zone.listing.status === "active") {
        await createOrder(tx, zone, zone.currentBidderId, zone.currentBidCents, zone.listing.sellerId, true);
        summary.ordersCreated++;
      } else {
        await tx.update(zones).set({ status: "unsold" }).where(eq(zones.id, zone.id));
        summary.zonesUnsold++;
      }
    }

    // Abandoned unpaid checkouts are cancelled. Buy-now never held the zone, so we only release
    // auction wins that reserved the spot while the winner was notified.
    const pending = await tx.query.orders.findMany({
      where: and(
        eq(orders.status, "pending_payment"),
        lt(orders.createdAt, new Date(now.getTime() - BUY_NOW_HOLD_MS)),
        listingId ? eq(orders.listingId, listingId) : undefined,
      ),
      with: { zone: { columns: { saleType: true } } },
    });
    const stale = pending.filter((o) => {
      const window = o.zone.saleType === "auction" ? AUCTION_PAYMENT_WINDOW_MS : BUY_NOW_HOLD_MS;
      return o.createdAt.getTime() < now.getTime() - window;
    });
    if (stale.length) {
      const ids = stale.map((o) => o.id);
      await tx.update(orders).set({ status: "cancelled" }).where(inArray(orders.id, ids));
      for (const o of stale) {
        if (o.zone.saleType === "auction") {
          for (const zoneId of allOrderZoneIds(o)) await releaseZone(tx, zoneId, now);
        }
      }
      summary.ordersExpired += ids.length;
    }

    // Buy-now used to mark the zone sold at checkout. Reopen any sold zone that isn't
    // actually held by a paid order or an unpaid auction win, so leftover holds go back on sale
    // as soon as a page is read — not after the unpaid-checkout cleanup window.
    const soldZones = await tx.query.zones.findMany({
      where: and(eq(zones.status, "sold"), listingId ? eq(zones.listingId, listingId) : undefined),
      columns: { id: true, listingId: true },
    });
    if (soldZones.length) {
      const listingIds = listingId ? [listingId] : [...new Set(soldZones.map((z) => z.listingId))];
      const related = await tx.query.orders.findMany({
        where: and(
          inArray(orders.listingId, listingIds),
          inArray(orders.status, [...HOLDING_ORDER_STATUSES, "pending_payment"]),
        ),
        columns: { id: true, status: true, zoneId: true, additionalZoneIds: true },
        with: { zone: { columns: { saleType: true } } },
      });
      const reserved = new Set<string>();
      for (const o of related) {
        const holds = (HOLDING_ORDER_STATUSES as readonly string[]).includes(o.status) || o.zone.saleType === "auction";
        if (!holds) continue;
        for (const zoneId of allOrderZoneIds(o)) reserved.add(zoneId);
      }
      for (const zone of soldZones) {
        if (!reserved.has(zone.id)) await releaseZone(tx, zone.id, now);
      }
    }

    // Proof the brand never responded to is approved automatically once the review window closes.
    const unanswered = await tx
      .update(orders)
      .set({ status: "completed", completedAt: now })
      .where(
        and(
          eq(orders.status, "proof_submitted"),
          lt(orders.proofSubmittedAt, new Date(now.getTime() - PROOF_REVIEW_WINDOW_MS)),
          listingId ? eq(orders.listingId, listingId) : undefined,
        ),
      )
      .returning({ id: orders.id });
    summary.proofsAutoApproved += unanswered.length;

    // Sealed reviews whose counterpart never showed up are revealed after the window.
    if (!listingId) {
      const revealed = await tx
        .update(reviews)
        .set({ publishedAt: now })
        .where(and(isNull(reviews.publishedAt), lt(reviews.createdAt, new Date(now.getTime() - REVIEW_REVEAL_WINDOW_MS))))
        .returning({ id: reviews.id });
      summary.reviewsRevealed += revealed.length;
    }

    // A listing is over when its deadline passed and no zone is still open.
    const candidates = await tx.query.listings.findMany({
      where: and(eq(listings.status, "active"), lt(listings.biddingEndsAt, now), listingId ? eq(listings.id, listingId) : undefined),
      with: { zones: { columns: { status: true }, where: eq(zones.status, "open") } },
    });
    const toEnd = candidates.filter((l) => l.zones.length === 0).map((l) => l.id);
    if (toEnd.length) {
      await tx.update(listings).set({ status: "ended", updatedAt: now }).where(and(inArray(listings.id, toEnd), ne(listings.status, "ended")));
      summary.listingsEnded += toEnd.length;
    }
    });
  } catch (err) {
    // Called from page reads. A locked or racing transaction must not 500 the request.
    console.error("settleExpired failed", listingId, err);
  }

  return summary;
}

/**
 * Puts a zone back on sale after its order fell through (unpaid auction win, refund). If the listing has already
 * closed the zone is marked unsold instead so it can't be bought after the deadline.
 */
export async function releaseZone(tx: Tx, zoneId: string, now = new Date()) {
  const zone = await tx.query.zones.findFirst({ where: eq(zones.id, zoneId), with: { listing: { columns: { status: true } } } });
  if (!zone) return;
  const canRelist = zone.listing.status === "active" && zone.endsAt.getTime() > now.getTime();
  await tx
    .update(zones)
    .set({ status: canRelist ? "open" : "unsold", currentBidCents: null, currentBidderId: null })
    .where(eq(zones.id, zoneId));
}
