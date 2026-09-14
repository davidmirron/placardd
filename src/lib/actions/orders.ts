"use server";

import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orderFiles, orders, reviews } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { activeProvider, createCheckoutUrl, markOrderPaid } from "@/lib/payments";
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
  if (order.status !== "proof_submitted") return { error: "There's no proof to approve yet." };
  await db.update(orders).set({ status: "completed", completedAt: new Date() }).where(eq(orders.id, orderId));
  revalidatePath(`/orders/${orderId}`);
  return { success: "Proof approved. Payout released to the seller." };
}

export async function disputeOrder(orderId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { order, isBuyer } = await loadOrder(orderId, user.id);
  if (!isBuyer) return { error: "Only the brand can flag an issue." };
  if (order.status !== "proof_submitted" && order.status !== "paid") return { error: "This order can't be disputed right now." };
  const reason = fieldString(form, "reason");
  if (reason.length < 10) return { error: "Describe the issue in a sentence or two." };
  await db.update(orders).set({ status: "disputed", disputeReason: reason.slice(0, 1000) }).where(eq(orders.id, orderId));
  revalidatePath(`/orders/${orderId}`);
  return { success: "Issue flagged. The seller can respond with new proof and our team will review." };
}

export async function leaveReview(orderId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { order, isBuyer } = await loadOrder(orderId, user.id);
  if (order.status !== "completed") return { error: "Reviews open once the order is completed." };
  const rating = fieldNumber(form, "rating");
  if (rating < 1 || rating > 5) return { error: "Pick a rating from 1 to 5." };
  const existing = await db.query.reviews.findFirst({ where: and(eq(reviews.orderId, orderId), eq(reviews.authorId, user.id)) });
  if (existing) return { error: "You've already reviewed this order." };
  await db.insert(reviews).values({
    id: nanoid(12),
    orderId,
    authorId: user.id,
    targetId: isBuyer ? order.sellerId : order.buyerId,
    rating: Math.round(rating),
    comment: fieldString(form, "comment").slice(0, 1000),
  });
  revalidatePath(`/orders/${orderId}`);
  return { success: "Thanks — your review is live." };
}
