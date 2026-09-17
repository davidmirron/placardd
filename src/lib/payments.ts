import "server-only";
import Stripe from "stripe";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, zones, type Order } from "@/lib/db/schema";
import { buyNowPrice } from "@/lib/auctions";
import { APP_NAME } from "@/lib/constants";
import { allOrderZoneIds } from "@/lib/order-spots";

/**
 * Payment providers. The platform collects the full amount and records its commission on the order.
 * Stripe is used when STRIPE_SECRET_KEY is configured; otherwise a built-in test checkout is used
 * so the full order lifecycle works locally. Seller payouts (Stripe Connect transfers) are the next step.
 */

export type PaymentProvider = "stripe" | "mock";

export function activeProvider(): PaymentProvider {
  return process.env.STRIPE_SECRET_KEY ? "stripe" : "mock";
}

let stripeClient: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured.");
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

export function appUrl() {
  return process.env.APP_URL ?? `http://127.0.0.1:${process.env.PORT ?? 4721}`;
}

export async function createCheckoutUrl(order: Order, description: string): Promise<string> {
  if (activeProvider() === "mock") {
    return `/checkout/${order.id}`;
  }
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: order.amountCents,
          product_data: { name: `${APP_NAME} ad spot`, description },
        },
      },
    ],
    metadata: { orderId: order.id },
    success_url: `${appUrl()}/orders/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/orders/${order.id}?cancelled=1`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

class SpotTakenError extends Error {
  constructor() {
    super("spot_taken");
    this.name = "SpotTakenError";
  }
}

export async function markOrderPaid(orderId: string, provider: PaymentProvider, paymentRef: string, paidAmountCents?: number): Promise<"paid" | "skipped" | "taken"> {
  try {
    return await db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
      if (!order) return "skipped" as const;
      // A late Stripe payment can land after we cancelled an abandoned unpaid checkout.
      // If the spots are still open, payment still wins. Already-paid / refunded is a no-op.
      if (order.status !== "pending_payment" && order.status !== "cancelled") return "skipped" as const;
      // Ignore a leftover checkout session from before more spots were added to this order.
      if (paidAmountCents != null && paidAmountCents !== order.amountCents) return "skipped" as const;

      const zoneIds = allOrderZoneIds(order);
      const current = await tx.query.zones.findMany({ where: inArray(zones.id, zoneIds) });
      const byId = new Map(current.map((z) => [z.id, z]));
      for (const zoneId of zoneIds) {
        const zone = byId.get(zoneId);
        if (!zone) throw new SpotTakenError();
        // Auction wins (and leftover pre-change buy-now holds) already marked the zone sold
        // for this buyer. Don't require it to be open, or payment would refund the winner.
        if (zone.status === "sold" && zone.currentBidderId === order.buyerId) continue;
        const price = buyNowPrice(zone) ?? zone.startingPriceCents;
        const claimed = await tx
          .update(zones)
          .set({ status: "sold", currentBidCents: price, currentBidderId: order.buyerId })
          .where(and(eq(zones.id, zoneId), eq(zones.status, "open")))
          .returning({ id: zones.id });
        if (claimed.length === 0) throw new SpotTakenError();
      }

      await tx
        .update(orders)
        .set({ status: "paid", paymentProvider: provider, paymentRef, paidAt: new Date() })
        .where(eq(orders.id, orderId));

      const rivals = await tx.query.orders.findMany({
        where: and(eq(orders.listingId, order.listingId), eq(orders.status, "pending_payment"), ne(orders.id, orderId)),
      });
      const taken = new Set(zoneIds);
      const rivalIds = rivals.filter((o) => allOrderZoneIds(o).some((id) => taken.has(id))).map((o) => o.id);
      if (rivalIds.length) await tx.update(orders).set({ status: "cancelled" }).where(inArray(orders.id, rivalIds));

      return "paid" as const;
    });
  } catch (err) {
    if (!(err instanceof SpotTakenError)) throw err;
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (provider === "stripe" && order && (order.status === "pending_payment" || order.status === "cancelled")) {
      const refundRef = await refundPayment({ id: orderId, paymentProvider: provider, paymentRef, amountCents: order.amountCents });
      await db
        .update(orders)
        .set({
          status: "refunded",
          paymentProvider: provider,
          paymentRef,
          refundRef,
          refundedAt: new Date(),
          disputeReason: "This spot sold to someone else before payment cleared. The charge was refunded.",
        })
        .where(eq(orders.id, orderId));
    } else if (provider !== "stripe" && order && (order.status === "pending_payment" || order.status === "cancelled")) {
      await db.update(orders).set({ status: "cancelled", paymentProvider: provider, paymentRef }).where(eq(orders.id, orderId));
    }
    return "taken";
  }
}

/**
 * Returns the brand's money. With Stripe this refunds the original PaymentIntent in full; in test mode
 * it just records a reference. Returns the provider's refund id so it can be stored on the order.
 */
export async function refundPayment(order: Pick<Order, "id" | "paymentProvider" | "paymentRef" | "amountCents">): Promise<string> {
  if (order.paymentProvider !== "stripe") return `test_refund_${order.id}`;
  if (!order.paymentRef) throw new Error("This order has no payment reference to refund.");
  const refund = order.paymentRef.startsWith("pi_")
    ? await stripe().refunds.create({ payment_intent: order.paymentRef, metadata: { orderId: order.id } })
    : await stripe().refunds.create({
        payment_intent: (await stripe().checkout.sessions.retrieve(order.paymentRef)).payment_intent as string,
        metadata: { orderId: order.id },
      });
  return refund.id;
}

/** Used on the success redirect as a fallback when webhooks are not reachable (e.g. local dev). */
export async function confirmStripeSession(sessionId: string) {
  if (activeProvider() !== "stripe") return;
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const orderId = session.metadata?.orderId;
  if (orderId && session.payment_status === "paid") {
    await markOrderPaid(orderId, "stripe", typeof session.payment_intent === "string" ? session.payment_intent : session.id, session.amount_total ?? undefined);
  }
}
