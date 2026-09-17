"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuctionError, buyNow, placeBid } from "@/lib/auctions";
import { AUCTIONS_ENABLED } from "@/lib/constants";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formatMoney } from "@/lib/format";
import { createCheckoutUrl } from "@/lib/payments";
import { allOrderZoneIds, orderLineDescription } from "@/lib/order-spots";
import { dollarsToCents, fieldString, type ActionState } from "./types";

async function requireBrand(listingId: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`);
  if (user.role !== "brand") return { user, error: "Only brand accounts can buy spots. Create a brand account to take part." };
  return { user, error: undefined };
}

export async function placeBidAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!AUCTIONS_ENABLED) return { error: "Bidding is not available right now. Spots are sold at a fixed price." };
  const zoneId = fieldString(form, "zoneId");
  const listingId = fieldString(form, "listingId");
  const { user, error } = await requireBrand(listingId);
  if (error) return { error };
  const amountCents = dollarsToCents(fieldString(form, "amount"));

  try {
    const result = await placeBid(zoneId, user.id, amountCents);
    revalidatePath(`/listings/${listingId}`);
    if (result.kind === "won") redirect(`/orders/${result.orderId}?won=1`);
    return {
      success: result.extended
        ? `You're the highest bidder at ${formatMoney(result.amountCents)}. Auction extended by 5 minutes.`
        : `You're the highest bidder at ${formatMoney(result.amountCents)}.`,
    };
  } catch (err) {
    if (err instanceof AuctionError) return { error: err.message };
    throw err;
  }
}

export async function buyNowAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const zoneIds = form.getAll("zoneId").map(String).filter(Boolean);
  const listingId = fieldString(form, "listingId");
  const { user, error } = await requireBrand(listingId);
  if (error) return { error };
  if (zoneIds.length === 0) return { error: "Pick at least one spot." };
  let checkoutUrl: string;
  try {
    const { orderId } = await buyNow(zoneIds, user.id);
    revalidatePath(`/listings/${listingId}`);
    // The spots are held for a short window while the brand pays; unpaid holds are released by settleExpired.
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        zone: { columns: { id: true, label: true } },
        listing: { columns: { title: true }, with: { zones: { columns: { id: true, label: true } } } },
      },
    });
    if (!order) throw new Error("Order was not created.");
    const labels = allOrderZoneIds(order).map((id) => order.listing.zones.find((z) => z.id === id)?.label ?? order.zone.label);
    checkoutUrl = await createCheckoutUrl(order, orderLineDescription(labels, order.listing.title));
  } catch (err) {
    if (err instanceof AuctionError) return { error: err.message };
    throw err;
  }
  redirect(checkoutUrl);
}
