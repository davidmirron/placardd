import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, Flag, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROOF_REVIEW_WINDOW_DAYS, REVIEW_REVEAL_WINDOW_DAYS } from "@/lib/constants";

export const metadata: Metadata = { title: "How it works" };

const creatorSteps = [
  ["Create a listing", "Name the event, what kind it is, how big it is, and how many people will actually see you — not everyone at a marathon sees one runner."],
  ["Upload photos", "Front, back, sides, details. Good photos sell spots; brands need to see exactly where their logo lands."],
  ["Draw your ad spots", "Drag rectangles on each photo. Give every spot a name, a size hint, and a price. You see what you'll earn on each one before you publish."],
  ["Publish and share", "Post the link. Brands buy straight from the listing page, and each sale shows up on your dashboard as a paid order."],
  ["Deliver and prove", "Print or wrap the logos, do the event, then upload proof photos or video. When the brand approves, your payout is released."],
];

const brandSteps = [
  ["Browse or search", "Filter by event type, what the logo is on, location, price and reach. Open a listing to see the mapped spots on real photos."],
  ["Buy the spot", "Hit Buy now and you go straight to checkout. The spot stays on sale until payment clears — clicking Buy now does not reserve it."],
  ["Send your assets", "Upload print-ready logos and placement notes on the order, and message the creator with any questions."],
  ["Approve proof", "After the event the creator uploads proof. Approve it to release payment, or flag an issue if something isn't right."],
];

const protections = [
  {
    icon: Lock,
    title: "Money is held, not handed over",
    body: "A brand pays at checkout and Placard holds the funds. The creator can see the order is paid, but nothing moves to them until the work is done.",
  },
  {
    icon: BadgeCheck,
    title: "Proof before payout",
    body: `The creator uploads photos or video of the logo in place. The brand has ${PROOF_REVIEW_WINDOW_DAYS} days to approve or flag an issue; if they do neither, the payout is released automatically so a creator is never left waiting on silence.`,
  },
  {
    icon: Flag,
    title: "Issues get resolved, not ignored",
    body: "Flagging an issue pauses the payout and tells the creator exactly what's wrong. They can fix it and resubmit, or refund the brand in full. If the two of you can't agree, escalate it and Placard makes the call.",
  },
  {
    icon: ShieldCheck,
    title: "Reviews you can trust",
    body: `Both sides review each completed deal. Reviews stay sealed until both are in (or ${REVIEW_REVEAL_WINDOW_DAYS} days pass), so nobody writes theirs in reaction to the other's. Ratings and completed-deal counts live on every profile.`,
  },
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
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-brand/40 bg-brand-soft/40 p-6">
            <h3 className="font-medium">One price, set by the creator</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Every spot has a single price. The brand pays exactly that at checkout — nothing added on top — and the spot is sold. No bidding, no haggling, no reservations without money behind them.
            </p>
          </div>
          <div className="rounded-2xl border p-6">
            <h3 className="font-medium">Creators see their earnings up front</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Placard&apos;s service is included in the price. When you set a price, the listing builder shows you exactly what you&apos;ll earn on that spot, so there are no surprises at payout.
            </p>
          </div>
          <div className="rounded-2xl border p-6">
            <h3 className="font-medium">Available until</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Creators set when spots stop being purchasable — by default the end of the event day — so there is always time to print or apply the logos.
            </p>
          </div>
          <div className="rounded-2xl border p-6">
            <h3 className="font-medium">Yours when you pay</h3>
            <p className="mt-1 text-sm text-muted-foreground">Clicking Buy now does not reserve the spot. It stays on sale until payment clears. If you leave checkout, anyone else can still buy it.</p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Why go through Placard</h2>
          <p className="text-muted-foreground">Sponsorship between strangers only works if neither side has to take the other on faith.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {protections.map((p) => (
            <div key={p.title} className="rounded-2xl border p-6">
              <p.icon className="mb-3 size-5 text-brand" />
              <h3 className="font-medium">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border p-6">
        <h2 className="text-2xl font-semibold">Ready?</h2>
        <p className="text-sm text-muted-foreground">Listing takes a photo and an afternoon. Buying takes a click.</p>
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
