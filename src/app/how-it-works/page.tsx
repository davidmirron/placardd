import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { AUCTIONS_ENABLED, BID_RULE_DESCRIPTIONS, PLATFORM_FEE_PERCENT } from "@/lib/constants";

export const metadata: Metadata = { title: "How it works" };

const creatorSteps = [
  ["Create a listing", "Name the event, where it happens, and how many people will see you: in the room and online. That number is what brands are buying."],
  ["Upload photos", "Front, back, sides, details. Brands pay for a spot they can picture. Show them exactly where the logo lands."],
  [
    "Draw your ad spots",
    AUCTIONS_ENABLED
      ? "Drag rectangles on each photo. Give every spot a name, a size hint, and a price. Choose auction or fixed price."
      : "Drag rectangles on each photo. Give every spot a name, a size hint, and a price. That price is what the brand pays — no haggling.",
  ],
  [
    "Publish and share",
    AUCTIONS_ENABLED
      ? "Post the link. Every outbid is a small drama your followers will watch. Countdown auctions end on your deadline."
      : "Post the link. Brands buy straight from the listing page, and each sale shows up on your dashboard as a paid order.",
  ],
  ["Wear it and prove it", "Print or wrap the logos, do the event, then upload proof photos or video. When the brand approves, your payout is released."],
];

const brandSteps = [
  ["Find the room", "Filter by event, category, location, price and reach. Open a listing and see the exact spots drawn on real photos."],
  [
    AUCTIONS_ENABLED ? "Bid or buy" : "Buy the spot",
    AUCTIONS_ENABLED
      ? "Place a bid that follows the spot's rule, or hit buy-now. You get an order the moment you win."
      : "Hit Buy now and you go straight to checkout. The spot is reserved for you while you pay and is yours the moment payment clears.",
  ],
  ["Send your assets", "Placard holds the funds. Upload print-ready logos and placement notes on the order, and message the creator with questions."],
  ["Approve proof", "After the event the creator uploads proof. Approve it to release payment, or flag an issue for review."],
];

export default function HowItWorksPage() {
  return (
    <div className="container-page max-w-4xl space-y-16 py-12 lg:py-16">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">How Placard works</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          You photograph what will be seen. You draw a box wherever a logo fits. You put a price on each box. A brand buys the box. You wear it, prove it, and get paid.
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

      {AUCTIONS_ENABLED ? (
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
      ) : (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Pricing</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-brand/40 bg-brand-soft/40 p-6">
              <h3 className="font-medium">Fixed price, paid up front</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Every spot has one price set by the creator. A brand pays it at checkout and the spot is sold. No bids, no reservations without money behind them.
              </p>
            </div>
            <div className="rounded-2xl border p-6">
              <h3 className="font-medium">Available until</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Creators set when spots stop being purchasable — by default the end of the event day — so there is always time to print or apply the logos.
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Clicking Buy now holds the spot for one hour while you complete checkout. If payment does not arrive, the spot goes back on sale.</li>
            <li>Auctions are built and will be switched on for brands with a verified card on file.</li>
          </ul>
        </section>
      )}

      <section className="space-y-4 rounded-2xl border p-6">
        <h2 className="text-2xl font-semibold">Fees and payouts</h2>
        <p className="text-sm text-muted-foreground">
          Brands pay the {AUCTIONS_ENABLED ? "winning" : "listed"} price. Placard keeps a {PLATFORM_FEE_PERCENT}% commission and releases the rest to the creator once the brand approves proof of delivery. If the brand flags an issue, the order pauses for review.
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
