"use server";

import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orderFiles, orders, reviews } from "@/lib/db/schema";
import { releaseZone } from "@/lib/auctions";
import { requireUser } from "@/lib/auth";
import { activeProvider, createCheckoutUrl, markOrderPaid, refundPayment } from "@/lib/payments";
import { deleteUpload } from "@/lib/storage";
import { fieldNumber, fieldString, type ActionState } from "./types";

async function loadOrder(orderId: string, userId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { zone: true, listing: true },
  });
  if (!order) throw new Error("Order not found.");
  const isBuyer = order.buyerId === userId;
  const isSeller = order.sellerId === userId;
  if (!isBuyer && !isSeller) throw new Error("You don't have access to this order.");
  return { order, isBuyer, isSeller };
}

export async function startCheckout(orderId: string): Promise<ActionState> {
  const user = await requireUser(`/orders/${orderId}`);
  const { order, isBuyer } = await loadOrder(orderId, user.id);
  if (!isBuyer) return { error: "Only the buyer can pay for this order." };
  if (order.status !== "pending_payment") return { error: "This order isn't awaiting payment." };
  const url = await createCheckoutUrl(order, `${order.zone.label} · ${order.listing.title}`);
  redirect(url);
}

/** Test-mode payment used when Stripe is not configured. */
export async function completeMockPayment(orderId: string): Promise<ActionState> {
  if (activeProvider() !== "mock") return { error: "Test payments are disabled when Stripe is configured." };
  const user = await requireUser(`/orders/${orderId}`);
  const { isBuyer } = await loadOrder(orderId, user.id);
  if (!isBuyer) return { error: "Only the buyer can pay for this order." };
  await markOrderPaid(orderId, "mock", `test_${nanoid(10)}`);
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}?paid=1`);
}

export async function saveBrandNotes(orderId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { isBuyer } = await loadOrder(orderId, user.id);
  if (!isBuyer) return { error: "Only the brand can edit placement instructions." };
  await db.update(orders).set({ brandNotes: fieldString(form, "brandNotes").slice(0, 2000) }).where(eq(orders.id, orderId));
  revalidatePath(`/orders/${orderId}`);
  return { success: "Instructions saved." };
}

export async function attachOrderFile(orderId: string, input: { url: string; mime: string; kind: "asset" | "proof"; note?: string }) {
  const user = await requireUser();
  const { order, isBuyer, isSeller } = await loadOrder(orderId, user.id);
  if (!input.url.startsWith("/api/files/")) throw new Error("Invalid file.");
  if (input.kind === "asset" && !isBuyer) throw new Error("Only the brand can upload creative assets.");
  if (input.kind === "proof" && !isSeller) throw new Error("Only the seller can upload proof.");
  if (input.kind === "proof" && !["paid", "proof_submitted", "disputed"].includes(order.status)) {
    throw new Error("Proof can be uploaded once the order is paid.");
  }
  await db.insert(orderFiles).values({
    id: nanoid(12),
    orderId,
    uploaderId: user.id,
    kind: input.kind,
    url: input.url,
    mime: input.mime,
    note: (input.note ?? "").slice(0, 500),
  });
  revalidatePath(`/orders/${orderId}`);
}

/**
 * Creator can pull a proof file before (re)submitting — a photo uploaded by mistake
 * shouldn't have to go to the brand. Once proof is submitted the set is frozen until
 * the brand flags an issue.
 */
export async function removeOrderFile(orderId: string, fileId: string) {
  const user = await requireUser();
  const { order, isSeller } = await loadOrder(orderId, user.id);
  const file = await db.query.orderFiles.findFirst({
    where: and(eq(orderFiles.id, fileId), eq(orderFiles.orderId, orderId)),
  });
  if (!file) throw new Error("File not found.");
  if (file.kind !== "proof") throw new Error("Only proof files can be removed here.");
  if (!isSeller) throw new Error("Only the creator can remove proof.");
  if (order.status !== "paid" && order.status !== "disputed") {
    throw new Error("Proof can only be removed before you send it for approval.");
  }
  await db.delete(orderFiles).where(and(eq(orderFiles.id, fileId), eq(orderFiles.orderId, orderId)));
  await deleteUpload(file.url);
  revalidatePath(`/orders/${orderId}`);
}

export async function submitProof(orderId: string): Promise<ActionState> {
  const user = await requireUser();
  const { order, isSeller } = await loadOrder(orderId, user.id);
  if (!isSeller) return { error: "Only the seller can submit proof." };
  if (order.status !== "paid" && order.status !== "disputed") return { error: "This order isn't waiting for proof." };
  const proofs = await db.query.orderFiles.findMany({ where: and(eq(orderFiles.orderId, orderId), eq(orderFiles.kind, "proof")), columns: { id: true } });
  if (proofs.length === 0) return { error: "Upload at least one proof photo or video first." };
  await db.update(orders).set({ status: "proof_submitted", proofSubmittedAt: new Date(), disputeReason: null }).where(eq(orders.id, orderId));
  revalidatePath(`/orders/${orderId}`);
  return { success: "Proof sent to the brand for approval." };
}

export async function approveProof(orderId: string): Promise<ActionState> {
  const user = await requireUser();
  const { order, isBuyer } = await loadOrder(orderId, user.id);
  if (!isBuyer) return { error: "Only the brand can approve proof." };
  // A brand can also close out an issue they flagged once the creator has put it right.
  if (order.status !== "proof_submitted" && order.status !== "disputed") return { error: "There's no proof to approve yet." };
  await db.update(orders).set({ status: "completed", completedAt: new Date(), disputeReason: null }).where(eq(orders.id, orderId));
  revalidatePath(`/orders/${orderId}`);
  return { success: order.status === "disputed" ? "Issue resolved. Payout released to the creator." : "Proof approved. Payout released to the creator." };
}

export async function disputeOrder(orderId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { order, isBuyer } = await loadOrder(orderId, user.id);
  if (!isBuyer) return { error: "Only the brand can flag an issue." };
  if (order.status !== "proof_submitted" && order.status !== "paid") return { error: "This order can't be disputed right now." };
  const reason = fieldString(form, "reason");
  if (reason.length < 10) return { error: "Describe the issue in a sentence or two." };
  await db.update(orders).set({ status: "disputed", disputeReason: reason.slice(0, 1000), disputedAt: new Date() }).where(eq(orders.id, orderId));
  revalidatePath(`/orders/${orderId}`);
  return { success: "Issue flagged. The payout is on hold until it's resolved." };
}

/**
 * The creator gives the money back. This is the honest exit for "I can't deliver" and the clean end
 * to a dispute neither side wants to drag out. The spot goes back on sale if the listing is still open.
 */
export async function refundOrder(orderId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { order, isSeller } = await loadOrder(orderId, user.id);
  if (!isSeller) return { error: "Only the creator can refund an order." };
  if (!["paid", "proof_submitted", "disputed"].includes(order.status)) return { error: "This order can't be refunded." };
  const note = fieldString(form, "note").slice(0, 1000);

  let refundRef: string;
  try {
    refundRef = await refundPayment(order);
  } catch (err) {
    console.error("Refund failed", orderId, err);
    return { error: "The refund couldn't be processed. Please try again or contact support." };
  }
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ status: "refunded", refundRef, refundedAt: new Date(), disputeReason: note ? `Refunded by creator: ${note}` : order.disputeReason })
      .where(eq(orders.id, orderId));
    await releaseZone(tx, order.zoneId);
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath(`/listings/${order.listingId}`);
  return { success: "The brand has been refunded in full." };
}

export async function leaveReview(orderId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { order, isBuyer } = await loadOrder(orderId, user.id);
  if (order.status !== "completed") return { error: "Reviews open once the order is completed." };
  const rating = fieldNumber(form, "rating");
  if (rating < 1 || rating > 5) return { error: "Pick a rating from 1 to 5." };
  const existing = await db.query.reviews.findMany({ where: eq(reviews.orderId, orderId) });
  if (existing.some((r) => r.authorId === user.id)) return { error: "You've already reviewed this order." };
  const theirs = existing.find((r) => r.authorId !== user.id);
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(reviews).values({
      id: nanoid(12),
      orderId,
      authorId: user.id,
      targetId: isBuyer ? order.sellerId : order.buyerId,
      rating: Math.round(rating),
      comment: fieldString(form, "comment").slice(0, 1000),
      // Second review in: both are unsealed together. First in: stays sealed until the other side posts.
      publishedAt: theirs ? now : null,
    });
    if (theirs) await tx.update(reviews).set({ publishedAt: now }).where(eq(reviews.orderId, orderId));
  });
  revalidatePath(`/orders/${orderId}`);
  if (theirs) revalidatePath("/u/[handle]", "page");
  return { success: theirs ? "Both reviews are now public." : "Posted. It stays hidden until they review you too." };
}
