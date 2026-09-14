import "server-only";
import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bids, conversations, listings, orders, reviews, users, zones, type ListingCategory } from "@/lib/db/schema";
import { isZoneLive, settleExpired } from "@/lib/auctions";
import { LISTING_CATEGORIES } from "@/lib/db/schema";

export type ListingSort = "ending" | "newest" | "price_asc" | "price_desc" | "reach";

export type ListingFilters = {
  q?: string;
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minReach?: number;
  sort?: ListingSort;
};

export function parseFilters(sp: Record<string, string | string[] | undefined>): ListingFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) ?? "";
  const num = (k: string) => {
    const n = Number(one(k));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const category = one("category");
  const sort = one("sort") as ListingSort;
  return {
    q: one("q") || undefined,
    category: (LISTING_CATEGORIES as readonly string[]).includes(category) ? category : undefined,
    location: one("location") || undefined,
    minPrice: num("minPrice"),
    maxPrice: num("maxPrice"),
    minReach: num("minReach"),
    sort: ["ending", "newest", "price_asc", "price_desc", "reach"].includes(sort) ? sort : "ending",
  };
}

export async function searchListings(filters: ListingFilters) {
  await settleExpired();
  const conditions = [eq(listings.status, "active")];
  if (filters.category) conditions.push(eq(listings.category, filters.category as ListingCategory));
  if (filters.location) conditions.push(like(listings.location, `%${filters.location}%`));
  if (filters.q) {
    const term = `%${filters.q}%`;
    conditions.push(or(like(listings.title, term), like(listings.description, term), like(listings.eventName, term), like(listings.location, term))!);
  }
  if (filters.minReach) conditions.push(sql`${listings.reachInPerson} + ${listings.reachSocial} >= ${filters.minReach}`);

  const rows = await db.query.listings.findMany({
    where: and(...conditions),
    with: {
      seller: { columns: { id: true, name: true, handle: true, avatarUrl: true, followers: true } },
      photos: { orderBy: asc(sql`sort_order`), limit: 1 },
      zones: { columns: { id: true, status: true, saleType: true, startingPriceCents: true, currentBidCents: true, buyNowPriceCents: true, bidCount: true, endsAt: true } },
    },
    orderBy: desc(listings.createdAt),
  });

  const enriched = rows.map((l) => {
    const open = l.zones.filter((z) => z.status === "open");
    const prices = open.map((z) => z.currentBidCents ?? z.startingPriceCents);
    const fromCents = prices.length ? Math.min(...prices) : null;
    const bidCount = l.zones.reduce((n, z) => n + z.bidCount, 0);
    const soldSpots = l.zones.filter((z) => z.status === "sold").length;
    const soonest = open.length ? Math.min(...open.map((z) => z.endsAt.getTime())) : l.biddingEndsAt.getTime();
    return { ...l, openSpots: open.length, totalSpots: l.zones.length, soldSpots, fromCents, bidCount, soonestEnd: soonest, reach: l.reachInPerson + l.reachSocial };
  });

  const filtered = enriched.filter((l) => {
    if (filters.minPrice && (l.fromCents == null || l.fromCents < filters.minPrice * 100)) return false;
    if (filters.maxPrice && (l.fromCents == null || l.fromCents > filters.maxPrice * 100)) return false;
    return true;
  });

  const sorters: Record<ListingSort, (a: (typeof filtered)[number], b: (typeof filtered)[number]) => number> = {
    ending: (a, b) => a.soonestEnd - b.soonestEnd,
    newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    price_asc: (a, b) => (a.fromCents ?? Infinity) - (b.fromCents ?? Infinity),
    price_desc: (a, b) => (b.fromCents ?? -1) - (a.fromCents ?? -1),
    reach: (a, b) => b.reach - a.reach,
  };
  return filtered.sort(sorters[filters.sort ?? "ending"]);
}

export type ListingSummary = Awaited<ReturnType<typeof searchListings>>[number];

export async function getListingDetail(id: string) {
  await settleExpired(id);
  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, id),
    with: {
      seller: true,
      photos: { orderBy: asc(sql`sort_order`) },
      zones: {
        orderBy: asc(sql`sort_order`),
        with: {
          currentBidder: { columns: { id: true, name: true, handle: true, companyName: true, avatarUrl: true } },
          bids: { orderBy: desc(bids.createdAt), limit: 10, with: { bidder: { columns: { id: true, name: true, handle: true, companyName: true } } } },
          order: { columns: { id: true, status: true, buyerId: true } },
        },
      },
    },
  });
  if (!listing) return null;
  const stats = await sellerStats(listing.sellerId);
  const now = Date.now();
  return { ...listing, zones: listing.zones.map((z) => ({ ...z, live: isZoneLive(z, now) })), sellerStats: stats };
}

export type ListingDetail = NonNullable<Awaited<ReturnType<typeof getListingDetail>>>;

export async function sellerStats(userId: string) {
  const [ratingRow] = await db
    .select({ avg: sql<number>`avg(${reviews.rating})`, count: sql<number>`count(*)` })
    .from(reviews)
    .where(eq(reviews.targetId, userId));
  const [completed] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(and(or(eq(orders.sellerId, userId), eq(orders.buyerId, userId)), eq(orders.status, "completed")));
  return {
    rating: ratingRow?.avg ? Number(ratingRow.avg) : null,
    reviewCount: Number(ratingRow?.count ?? 0),
    completedOrders: Number(completed?.count ?? 0),
  };
}

export async function getProfileByHandle(handle: string) {
  const user = await db.query.users.findFirst({ where: eq(users.handle, handle) });
  if (!user) return null;
  await settleExpired();
  const [stats, received, activeListings] = await Promise.all([
    sellerStats(user.id),
    db.query.reviews.findMany({
      where: eq(reviews.targetId, user.id),
      orderBy: desc(reviews.createdAt),
      with: { author: { columns: { id: true, name: true, handle: true, avatarUrl: true, companyName: true } }, order: { with: { listing: { columns: { id: true, title: true } } } } },
    }),
    db.query.listings.findMany({
      where: and(eq(listings.sellerId, user.id), inArray(listings.status, ["active", "ended"])),
      orderBy: desc(listings.createdAt),
      with: { photos: { orderBy: asc(sql`sort_order`), limit: 1 }, zones: { columns: { status: true, startingPriceCents: true, currentBidCents: true, bidCount: true } } },
    }),
  ]);
  return { user, stats, reviews: received, listings: activeListings };
}

export async function getCreatorDashboard(userId: string) {
  await settleExpired();
  const [myListings, myOrders] = await Promise.all([
    db.query.listings.findMany({
      where: eq(listings.sellerId, userId),
      orderBy: desc(listings.createdAt),
      with: {
        photos: { orderBy: asc(sql`sort_order`), limit: 1 },
        zones: { columns: { id: true, status: true, startingPriceCents: true, currentBidCents: true, bidCount: true, label: true } },
      },
    }),
    db.query.orders.findMany({
      where: eq(orders.sellerId, userId),
      orderBy: desc(orders.createdAt),
      with: { zone: { columns: { label: true } }, listing: { columns: { id: true, title: true } }, buyer: { columns: { name: true, companyName: true, handle: true } } },
    }),
  ]);
  const earnings = myOrders.filter((o) => ["paid", "proof_submitted", "completed"].includes(o.status)).reduce((s, o) => s + o.sellerNetCents, 0);
  const released = myOrders.filter((o) => o.status === "completed").reduce((s, o) => s + o.sellerNetCents, 0);
  const liveBids = myListings.reduce((n, l) => n + l.zones.reduce((m, z) => m + (z.status === "open" ? z.bidCount : 0), 0), 0);
  return { listings: myListings, orders: myOrders, earnings, released, liveBids };
}

export async function getBrandDashboard(userId: string) {
  await settleExpired();
  const myBidZoneIds = await db.selectDistinct({ zoneId: bids.zoneId }).from(bids).where(eq(bids.bidderId, userId));
  const [bidZones, myOrders] = await Promise.all([
    myBidZoneIds.length
      ? db.query.zones.findMany({
          where: inArray(zones.id, myBidZoneIds.map((r) => r.zoneId)),
          with: { listing: { columns: { id: true, title: true, status: true } }, order: { columns: { id: true, buyerId: true, status: true } } },
          orderBy: asc(zones.endsAt),
        })
      : Promise.resolve([]),
    db.query.orders.findMany({
      where: eq(orders.buyerId, userId),
      orderBy: desc(orders.createdAt),
      with: { zone: { columns: { label: true } }, listing: { columns: { id: true, title: true, eventName: true } }, seller: { columns: { name: true, handle: true } } },
    }),
  ]);
  const spend = myOrders.filter((o) => o.status !== "cancelled" && o.status !== "pending_payment").reduce((s, o) => s + o.amountCents, 0);
  return { bidZones, orders: myOrders, spend };
}

export async function getOrderForUser(orderId: string, userId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      zone: { with: { photo: true } },
      listing: { columns: { id: true, title: true, eventName: true, eventDate: true, location: true, includes: true } },
      seller: { columns: { id: true, name: true, handle: true, avatarUrl: true, socialHandle: true, companyName: true, website: true } },
      buyer: { columns: { id: true, name: true, handle: true, avatarUrl: true, socialHandle: true, companyName: true, website: true } },
      files: { orderBy: asc(sql`created_at`) },
      reviews: true,
    },
  });
  if (!order) return null;
  if (order.buyerId !== userId && order.sellerId !== userId) return null;
  return order;
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderForUser>>>;

export async function getConversationsForUser(userId: string) {
  const rows = await db.query.conversations.findMany({
    where: or(eq(conversations.participantAId, userId), eq(conversations.participantBId, userId)),
    orderBy: desc(conversations.lastMessageAt),
    with: {
      participantA: { columns: { id: true, name: true, handle: true, avatarUrl: true, companyName: true } },
      participantB: { columns: { id: true, name: true, handle: true, avatarUrl: true, companyName: true } },
      listing: { columns: { id: true, title: true } },
      messages: { orderBy: desc(sql`created_at`), limit: 1 },
    },
  });
  return rows.map((c) => ({ ...c, other: c.participantAId === userId ? c.participantB : c.participantA, last: c.messages[0] ?? null }));
}

export async function getConversation(conversationId: string, userId: string) {
  const convo = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    with: {
      participantA: { columns: { id: true, name: true, handle: true, avatarUrl: true, companyName: true } },
      participantB: { columns: { id: true, name: true, handle: true, avatarUrl: true, companyName: true } },
      listing: { columns: { id: true, title: true } },
      messages: { orderBy: asc(sql`created_at`), with: { sender: { columns: { id: true, name: true } } } },
    },
  });
  if (!convo || (convo.participantAId !== userId && convo.participantBId !== userId)) return null;
  return { ...convo, other: convo.participantAId === userId ? convo.participantB : convo.participantA };
}

export async function getFeaturedListings(limit = 6) {
  const all = await searchListings({ sort: "ending" });
  return all.slice(0, limit);
}

export async function getMarketplaceStats() {
  const paidStatuses = ["paid", "proof_submitted", "completed"] as const;
  const [[live], [sold], [volume]] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(zones).where(eq(zones.status, "open")),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(inArray(orders.status, [...paidStatuses])),
    db.select({ sum: sql<number>`coalesce(sum(${orders.amountCents}), 0)` }).from(orders).where(inArray(orders.status, [...paidStatuses])),
  ]);
  return { liveSpots: Number(live?.count ?? 0), spotsSold: Number(sold?.count ?? 0), volumeCents: Number(volume?.sum ?? 0) };
}
