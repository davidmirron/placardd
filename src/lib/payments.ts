import "server-only";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, zones, type Order } from "@/lib/db/schema";
import { APP_NAME } from "@/lib/constants";

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

export async function markOrderPaid(orderId: string, provider: PaymentProvider, paymentRef: string) {
  await db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order || order.status !== "pending_payment") return;
    await tx
      .update(orders)
      .set({ status: "paid", paymentProvider: provider, paymentRef, paidAt: new Date() })
      .where(eq(orders.id, orderId));
    await tx.update(zones).set({ status: "sold" }).where(eq(zones.id, order.zoneId));
  });
}

/** Used on the success redirect as a fallback when webhooks are not reachable (e.g. local dev). */
export async function confirmStripeSession(sessionId: string) {
  if (activeProvider() !== "stripe") return;
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const orderId = session.metadata?.orderId;
  if (orderId && session.payment_status === "paid") {
    await markOrderPaid(orderId, "stripe", typeof session.payment_intent === "string" ? session.payment_intent : session.id);
  }
}
