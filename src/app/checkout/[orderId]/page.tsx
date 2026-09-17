import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/form-bits";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth";
import { completeMockPayment } from "@/lib/actions/orders";
import { formatMoney } from "@/lib/format";
import { activeProvider } from "@/lib/payments";
import { getOrderForUser } from "@/lib/queries";
import { orderSpotHeading } from "@/lib/order-spots";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: PageProps<"/checkout/[orderId]">) {
  const { orderId } = await params;
  const user = await requireUser(`/checkout/${orderId}`);
  if (activeProvider() !== "mock") redirect(`/orders/${orderId}`);
  const order = await getOrderForUser(orderId, user.id);
  if (!order || order.buyerId !== user.id) notFound();
  if (order.status !== "pending_payment") redirect(`/orders/${orderId}`);

  async function pay() {
    "use server";
    await completeMockPayment(orderId);
  }

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md space-y-6 rounded-2xl border p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">Test checkout</span>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Paying {order.seller.name} via Placard</p>
          <p className="text-3xl font-semibold tabular-nums">{formatMoney(order.amountCents)}</p>
          <p className="text-sm text-muted-foreground">
            {orderSpotHeading(order.spots.map((s) => s.label))} · {order.listing.title}
          </p>
        </div>
        <div className="space-y-3 rounded-xl border bg-muted/40 p-4 text-sm">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <span className="text-muted-foreground">Card</span>
            <span className="font-mono">4242 4242 4242 4242</span>
            <span className="text-muted-foreground">Expiry</span>
            <span className="font-mono">12 / 34</span>
            <span className="text-muted-foreground">CVC</span>
            <span className="font-mono">123</span>
          </div>
          <p className="text-xs text-muted-foreground">
            No real payment is taken. Set <code>STRIPE_SECRET_KEY</code> to switch this page for Stripe Checkout.
          </p>
        </div>
        <form action={pay} className="space-y-3">
          <SubmitButton size="lg" className="w-full" pendingText="Processing…">
            <Lock /> Pay {formatMoney(order.amountCents)}
          </SubmitButton>
          <Button asChild variant="ghost" className="w-full">
            <Link href={`/orders/${orderId}?cancelled=1`}>Cancel</Link>
          </Button>
        </form>
      </div>
    </div>
  );
}
