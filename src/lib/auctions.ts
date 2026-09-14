import { and, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, type Db } from "@/lib/db";
import { bids, listings, orders, zones, type Zone } from "@/lib/db/schema";
import { ANTI_SNIPE_WINDOW_MS, PAYMENT_WINDOW_MS } from "@/lib/constants";
import { splitAmount } from "@/lib/money";

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
  if (zone.buyNowPriceCents == null) return null;
  // Once bidding passes the buy-now price the instant option disappears.
  if (zone.currentBidCents != null && zone.currentBidCents >= zone.buyNowPriceCents) return null;
  return zone.buyNowPriceCents;
}

export function isZoneLive(zone: Pick<Zone, "status" | "endsAt">, now = Date.now()) {
  return zone.status === "open" && zone.endsAt.getTime() > now;
}

async function createOrder(tx: Tx, zone: Zone, buyerId: string, amountCents: number, sellerId: string) {
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
  await tx
    .update(zones)
    .set({ status: "sold", currentBidCents: amountCents, currentBidderId: buyerId })
    .where(eq(zones.id, zone.id));
  return id;
}

export async function placeBid(zoneId: string, bidderId: string, amountCents: number) {
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
      const orderId = await createOrder(tx, zone, bidderId, instantPrice, zone.listing.sellerId);
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

export async function buyNow(zoneId: string, buyerId: string) {
  return db.transaction(async (tx) => {
    const zone = await tx.query.zones.findFirst({ where: eq(zones.id, zoneId), with: { listing: true } });
    if (!zone) throw new AuctionError("This spot no longer exists.");
    if (zone.listing.status !== "active") throw new AuctionError("This listing is not accepting orders.");
    if (zone.listing.sellerId === buyerId) throw new AuctionError("You can't buy your own listing.");
    if (!isZoneLive(zone)) throw new AuctionError("This spot is no longer available.");
    const price = buyNowPrice(zone);
    if (price == null) throw new AuctionError("This spot doesn't offer instant purchase.");
    const orderId = await createOrder(tx, zone, buyerId, price, zone.listing.sellerId);
    return { orderId, amountCents: price };
  });
}

/**
 * Settles anything that has expired. Called lazily from reads so no scheduler is required for the MVP;
 * the same function is exposed on /api/cron/settle for a real scheduler later.
 */
export async function settleExpired(listingId?: string) {
  const now = new Date();
  const summary = { ordersCreated: 0, zonesUnsold: 0, listingsEnded: 0, ordersExpired: 0 };

  await db.transaction(async (tx) => {
    const expired = await tx.query.zones.findMany({
      where: and(eq(zones.status, "open"), lt(zones.endsAt, now), listingId ? eq(zones.listingId, listingId) : undefined),
      with: { listing: true },
    });

    for (const zone of expired) {
      if (zone.currentBidderId && zone.currentBidCents != null && zone.listing.status === "active") {
        await createOrder(tx, zone, zone.currentBidderId, zone.currentBidCents, zone.listing.sellerId);
        summary.ordersCreated++;
      } else {
        await tx.update(zones).set({ status: "unsold" }).where(eq(zones.id, zone.id));
        summary.zonesUnsold++;
      }
    }

    // Orders nobody paid for inside the payment window are released.
    const stale = await tx.query.orders.findMany({
      where: and(
        eq(orders.status, "pending_payment"),
        lt(orders.createdAt, new Date(now.getTime() - PAYMENT_WINDOW_MS)),
        listingId ? eq(orders.listingId, listingId) : undefined,
      ),
    });
    if (stale.length) {
      const ids = stale.map((o) => o.id);
      await tx.update(orders).set({ status: "cancelled" }).where(inArray(orders.id, ids));
      await tx.update(zones).set({ status: "unsold" }).where(inArray(zones.id, stale.map((o) => o.zoneId)));
      summary.ordersExpired += ids.length;
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

  return summary;
}
