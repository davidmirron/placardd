"use server";

import { and, eq, inArray, notInArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { BID_RULES, EVENT_TYPES, LISTING_CATEGORIES, listings, photos, SALE_TYPES, zones } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth";
import { AUCTIONS_ENABLED } from "@/lib/constants";
import { dollarsToCents, fieldCount, fieldString, type ActionState } from "./types";

const DEFAULT_AVAILABILITY_MS = 90 * 24 * 60 * 60 * 1000;

const listingSchema = z.object({
  title: z.string().min(4, "Give your listing a clear title.").max(120),
  description: z.string().max(4000),
  category: z.enum(LISTING_CATEGORIES),
  eventType: z.enum(EVENT_TYPES, { error: "What kind of event is this?" }),
  eventName: z.string().max(120),
  eventDate: z.string(),
  location: z.string().min(2, "Where will this be seen?").max(120),
  biddingEndsAt: z.string(),
  eventAttendance: z.number().min(0),
  reachInPerson: z.number().min(0),
  reachSocial: z.number().min(0),
  audienceProfile: z.string().max(500),
  includes: z.string().max(2000),
});

function parseListingForm(form: FormData) {
  return listingSchema.safeParse({
    title: fieldString(form, "title"),
    description: fieldString(form, "description"),
    category: fieldString(form, "category"),
    eventType: fieldString(form, "eventType"),
    eventName: fieldString(form, "eventName"),
    eventDate: fieldString(form, "eventDate"),
    location: fieldString(form, "location"),
    biddingEndsAt: fieldString(form, "biddingEndsAt"),
    eventAttendance: fieldCount(form, "eventAttendance"),
    reachInPerson: fieldCount(form, "reachInPerson"),
    reachSocial: fieldCount(form, "reachSocial"),
    audienceProfile: fieldString(form, "audienceProfile"),
    includes: fieldString(form, "includes"),
  });
}

function toDate(value: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * When spots stop being purchasable. Explicit value wins; otherwise the end of the event day,
 * otherwise a generous default. In auction mode this is the bidding deadline and must be set.
 */
function resolveAvailability(data: { biddingEndsAt: string; eventDate: string }): { endsAt: Date } | { error: string } {
  const explicit = toDate(data.biddingEndsAt);
  if (data.biddingEndsAt && !explicit) return { error: AUCTIONS_ENABLED ? "Set a valid bidding deadline." : "Set a valid date for when the spots stop being available." };
  if (AUCTIONS_ENABLED && !explicit) return { error: "Set a bidding deadline." };

  let endsAt = explicit;
  if (!endsAt) {
    const eventDate = toDate(data.eventDate);
    if (eventDate) {
      endsAt = new Date(eventDate);
      endsAt.setHours(23, 59, 0, 0);
    }
  }
  if (!endsAt) endsAt = new Date(Date.now() + DEFAULT_AVAILABILITY_MS);

  if (endsAt.getTime() < Date.now() + 60 * 60 * 1000) {
    return { error: AUCTIONS_ENABLED ? "The bidding deadline must be at least an hour from now." : "Spots must stay available for at least an hour from now. Check the event date or the 'available until' field." };
  }
  return { endsAt };
}

async function ownedListing(listingId: string, userId: string) {
  const listing = await db.query.listings.findFirst({ where: and(eq(listings.id, listingId), eq(listings.sellerId, userId)) });
  if (!listing) throw new Error("Listing not found.");
  return listing;
}

export async function createListing(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole("creator", "/sell/new");
  const parsed = parseListingForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const data = parsed.data;
  const availability = resolveAvailability(data);
  if ("error" in availability) return { error: availability.error };
  const biddingEndsAt = availability.endsAt;

  const id = nanoid(10);
  await db.insert(listings).values({
    id,
    sellerId: user.id,
    title: data.title,
    description: data.description,
    category: data.category,
    eventType: data.eventType,
    eventName: data.eventName || null,
    eventDate: toDate(data.eventDate),
    location: data.location,
    biddingEndsAt,
    eventAttendance: Math.round(data.eventAttendance),
    reachInPerson: Math.round(data.reachInPerson),
    reachSocial: Math.round(data.reachSocial),
    audienceProfile: data.audienceProfile,
    includes: data.includes,
    status: "draft",
  });
  redirect(`/sell/${id}/edit?step=photos`);
}

export async function updateListing(listingId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole("creator");
  await ownedListing(listingId, user.id);
  const parsed = parseListingForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const data = parsed.data;
  const availability = resolveAvailability(data);
  if ("error" in availability) return { error: availability.error };
  const biddingEndsAt = availability.endsAt;

  await db.transaction(async (tx) => {
    await tx
      .update(listings)
      .set({
        title: data.title,
        description: data.description,
        category: data.category,
        eventType: data.eventType,
        eventName: data.eventName || null,
        eventDate: toDate(data.eventDate),
        location: data.location,
        biddingEndsAt,
        eventAttendance: Math.round(data.eventAttendance),
        reachInPerson: Math.round(data.reachInPerson),
        reachSocial: Math.round(data.reachSocial),
        audienceProfile: data.audienceProfile,
        includes: data.includes,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listingId));
    // Open spots without bids follow the listing's availability; spots with bids keep their own clock.
    await tx
      .update(zones)
      .set({ endsAt: biddingEndsAt })
      .where(and(eq(zones.listingId, listingId), eq(zones.status, "open"), eq(zones.bidCount, 0)));
  });
  revalidatePath(`/listings/${listingId}`);
  revalidatePath(`/sell/${listingId}/edit`);
  return { success: "Listing details saved." };
}

const photoSchema = z.object({
  url: z.string().startsWith("/api/files/"),
  label: z.string().min(1).max(40),
  width: z.number().int().min(0),
  height: z.number().int().min(0),
});

export async function addPhoto(listingId: string, input: z.infer<typeof photoSchema>) {
  const user = await requireRole("creator");
  await ownedListing(listingId, user.id);
  const data = photoSchema.parse(input);
  const existing = await db.query.photos.findMany({ where: eq(photos.listingId, listingId), columns: { id: true } });
  if (existing.length >= 8) throw new Error("A listing can have up to 8 photos.");
  const id = nanoid(10);
  await db.insert(photos).values({ id, listingId, ...data, sortOrder: existing.length });
  revalidatePath(`/sell/${listingId}/edit`);
  return { id };
}

export async function removePhoto(listingId: string, photoId: string) {
  const user = await requireRole("creator");
  await ownedListing(listingId, user.id);
  const zoneWithBids = await db.query.zones.findFirst({
    where: and(eq(zones.photoId, photoId), eq(zones.status, "open")),
    columns: { bidCount: true },
  });
  if (zoneWithBids && zoneWithBids.bidCount > 0) throw new Error("This photo has a spot with active bids and can't be removed.");
  await db.delete(photos).where(and(eq(photos.id, photoId), eq(photos.listingId, listingId)));
  revalidatePath(`/sell/${listingId}/edit`);
}

const zoneInput = z.object({
  id: z.string().optional(),
  photoId: z.string(),
  label: z.string().min(1, "Every spot needs a name.").max(60),
  description: z.string().max(500),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.01).max(1),
  h: z.number().min(0.01).max(1),
  saleType: z.enum(SALE_TYPES),
  bidRule: z.enum(BID_RULES),
  startingPrice: z.number().min(1, "Starting price must be at least $1."),
  minIncrement: z.number().min(0),
  buyNowPrice: z.number().nullable(),
});
export type ZoneInput = z.infer<typeof zoneInput>;

export async function saveZones(listingId: string, input: ZoneInput[]): Promise<ActionState> {
  const user = await requireRole("creator");
  const listing = await ownedListing(listingId, user.id);
  const parsed = z.array(zoneInput).max(30).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your spots." };

  const listingPhotos = await db.query.photos.findMany({ where: eq(photos.listingId, listingId), columns: { id: true } });
  const photoIds = new Set(listingPhotos.map((p) => p.id));
  if (parsed.data.some((z) => !photoIds.has(z.photoId))) return { error: "One of the spots points at a photo that no longer exists." };

  const existing = await db.query.zones.findMany({ where: eq(zones.listingId, listingId) });
  const existingById = new Map(existing.map((z) => [z.id, z]));
  const keepIds = new Set<string>();

  await db.transaction(async (tx) => {
    let order = 0;
    for (const z of parsed.data) {
      // With auctions switched off every spot is a fixed price, whatever the client sent.
      const saleType = AUCTIONS_ENABLED ? z.saleType : "buy_now";
      const buyNowCents = saleType === "auction" && z.buyNowPrice ? dollarsToCents(z.buyNowPrice) : null;
      const pricing = {
        saleType,
        bidRule: z.bidRule,
        startingPriceCents: dollarsToCents(z.startingPrice),
        minIncrementCents: dollarsToCents(z.minIncrement || 25),
        buyNowPriceCents: buyNowCents,
      };
      const geometry = { x: z.x, y: z.y, w: z.w, h: z.h, photoId: z.photoId };
      const copy = { label: z.label, description: z.description, sortOrder: order++ };

      const current = z.id ? existingById.get(z.id) : undefined;
      if (current) {
        keepIds.add(current.id);
        const locked = current.bidCount > 0 || current.status !== "open";
        await tx
          .update(zones)
          .set(locked ? copy : { ...copy, ...geometry, ...pricing })
          .where(eq(zones.id, current.id));
      } else {
        const id = nanoid(10);
        keepIds.add(id);
        await tx.insert(zones).values({ id, listingId, ...copy, ...geometry, ...pricing, endsAt: listing.biddingEndsAt });
      }
    }
    const removable = existing.filter((z) => !keepIds.has(z.id) && z.bidCount === 0 && z.status === "open").map((z) => z.id);
    if (removable.length) await tx.delete(zones).where(inArray(zones.id, removable));
  });

  const lockedRemoved = existing.filter((z) => !keepIds.has(z.id) && (z.bidCount > 0 || z.status !== "open"));
  revalidatePath(`/sell/${listingId}/edit`);
  revalidatePath(`/listings/${listingId}`);
  return lockedRemoved.length
    ? { success: AUCTIONS_ENABLED ? "Spots saved. Spots with bids or orders were kept." : "Spots saved. Spots that already have an order were kept." }
    : { success: "Spots saved." };
}

export async function publishListing(listingId: string): Promise<ActionState> {
  const user = await requireRole("creator");
  const listing = await ownedListing(listingId, user.id);
  const [photoCount, zoneCount] = await Promise.all([
    db.query.photos.findMany({ where: eq(photos.listingId, listingId), columns: { id: true } }),
    db.query.zones.findMany({ where: eq(zones.listingId, listingId), columns: { id: true } }),
  ]);
  if (photoCount.length === 0) return { error: "Add at least one photo before publishing." };
  if (zoneCount.length === 0) return { error: "Draw at least one ad spot before publishing." };
  if (listing.biddingEndsAt.getTime() < Date.now()) {
    return { error: AUCTIONS_ENABLED ? "The bidding deadline is in the past. Update it first." : "The 'available until' date is in the past. Update it first." };
  }

  await db.update(listings).set({ status: "active", updatedAt: new Date() }).where(eq(listings.id, listingId));
  revalidatePath("/listings");
  redirect(`/listings/${listingId}?published=1`);
}

export async function unpublishListing(listingId: string): Promise<ActionState> {
  const user = await requireRole("creator");
  const listing = await ownedListing(listingId, user.id);
  const withBids = await db.query.zones.findFirst({ where: and(eq(zones.listingId, listingId), eq(zones.status, "open")), columns: { bidCount: true } });
  if (withBids && withBids.bidCount > 0) return { error: "Spots already have bids. Cancel the listing instead." };
  await db.update(listings).set({ status: "draft", updatedAt: new Date() }).where(eq(listings.id, listing.id));
  revalidatePath(`/sell/${listingId}/edit`);
  return { success: "Listing moved back to draft." };
}

export async function cancelListing(listingId: string): Promise<ActionState> {
  const user = await requireRole("creator");
  await ownedListing(listingId, user.id);
  await db.transaction(async (tx) => {
    await tx.update(listings).set({ status: "cancelled", updatedAt: new Date() }).where(eq(listings.id, listingId));
    await tx.update(zones).set({ status: "cancelled" }).where(and(eq(zones.listingId, listingId), eq(zones.status, "open")));
  });
  revalidatePath(`/listings/${listingId}`);
  redirect("/dashboard");
}

export async function deleteDraft(listingId: string): Promise<ActionState> {
  const user = await requireRole("creator");
  const listing = await ownedListing(listingId, user.id);
  if (listing.status !== "draft") return { error: "Only drafts can be deleted." };
  await db.delete(listings).where(and(eq(listings.id, listingId), notInArray(listings.status, ["active", "ended"])));
  redirect("/dashboard");
}
