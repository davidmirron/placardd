import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { BID_RULE_DESCRIPTIONS, PLATFORM_FEE_PERCENT } from "@/lib/constants";

export const metadata: Metadata = { title: "How it works" };

const creatorSteps = [
  ["Create a listing", "Name the event or time window, where it happens, and how many people will see you — in person and online."],
  ["Upload photos", "Front, back, sides, details. Good photos sell spots; brands need to see exactly where their logo lands."],
  ["Draw your ad spots", "Drag rectangles on each photo. Give every spot a name, a size hint, and a price. Choose auction or fixed price."],
  ["Publish and share", "Post the link. Every outbid is a small drama your followers will watch. Countdown auctions end on your deadline."],
  ["Deliver and prove", "Print or wrap the logos, do the event, then upload proof photos or video. When the brand approves, your payout is released."],
];

const brandSteps = [
  ["Browse or search", "Filter by event, category, location, price and reach. Open a listing to see the mapped spots on real photos."],
  ["Bid or buy", "Place a bid that follows the spot's rule, or hit buy-now. You get an order the moment you win."],
  ["Pay and send assets", "Pay securely up front — Placard holds the funds. Upload print-ready logos and placement notes on the order."],
  ["Approve proof", "After the event the creator uploads proof. Approve it to release payment, or flag an issue for review."],
];

export default function HowItWorksPage() {
  return (
    <div className="container-page max-w-4xl space-y-16 py-12 lg:py-16">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">How Placard works</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          A self-serve marketplace where anyone can sell physical ad space — and brands can buy exactly the spot they want, with proof before payout.
        </p>
      </header>

      <section className="grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="mb-6 text-2xl font-semibold">For creators</h2>
          <ol className="space-y-5">
            {creatorSteps.map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">{i + 1}</span>
                <div>
                  <h3 className="font-medium">{title}</h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="mb-6 text-2xl font-semibold">For brands</h2>
          <ol className="space-y-5">
            {brandSteps.map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">{i + 1}</span>
                <div>
                  <h3 className="font-medium">{title}</h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Auction rules</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border p-6">
            <h3 className="font-medium">Minimum increment</h3>
            <p className="mt-1 text-sm text-muted-foreground">{BID_RULE_DESCRIPTIONS.increment}</p>
          </div>
          <div className="rounded-2xl border border-brand/40 bg-brand-soft/40 p-6">
            <h3 className="font-medium">Doubling bids</h3>
            <p className="mt-1 text-sm text-muted-foreground">{BID_RULE_DESCRIPTIONS.doubling}</p>
          </div>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>Every spot has its own countdown. A bid in the final five minutes extends that spot by five minutes so nobody wins by sniping.</li>
          <li>Creators can add a buy-now price to any auction. A bid at or above it takes the spot instantly.</li>
          <li>Winners have 48 hours to pay. Unpaid spots are released.</li>
        </ul>
      </section>

      <section className="space-y-4 rounded-2xl border p-6">
        <h2 className="text-2xl font-semibold">Fees and payouts</h2>
        <p className="text-sm text-muted-foreground">
          Brands pay the winning price. Placard keeps a {PLATFORM_FEE_PERCENT}% commission and releases the rest to the creator once the brand approves proof of delivery. If the brand flags an issue, the order pauses for review.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/signup?role=creator">Start as a creator</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signup?role=brand">Start as a brand</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
