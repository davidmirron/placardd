import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { activeProvider, markOrderPaid, stripe } from "@/lib/payments";

export async function POST(req: NextRequest) {
  if (activeProvider() !== "stripe") return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId && session.payment_status === "paid") {
      await markOrderPaid(orderId, "stripe", typeof session.payment_intent === "string" ? session.payment_intent : session.id, session.amount_total ?? undefined);
    }
  }

  return NextResponse.json({ received: true });
}
