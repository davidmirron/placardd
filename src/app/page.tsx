import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { ZoneOverlay } from "@/components/zone-overlay";
import { getCurrentUser } from "@/lib/auth";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { getFeaturedListings, getMarketplaceStats } from "@/lib/queries";

/**
 * Public, reported sales of physical ad space. Shown in place of marketplace stats until
 * Placard has real sales of its own, so the page never leads with zeros or seeded numbers.
 */
const PRECEDENTS = [
  { price: "$21,800", what: "Nine square inches of an Olympic runner's shoulder", when: "eBay, 2016" },
  { price: "€1,600", what: "The top spot on the back of a wedding tuxedo", when: "26 startups, 2025" },
  { price: "$20,000", what: "One founder's glutes, for one race", when: "Bought by Stanley, 2026" },
  { price: "$112,062", what: "15 spots on one body, sold out in 48 hours", when: "September 2026" },
];

export default async function HomePage() {
  const [featured, stats, user] = await Promise.all([getFeaturedListings(6), getMarketplaceStats(), getCurrentUser()]);
  const hasRealSales = stats.spotsSold > 0;

  return (
    <div>
      <section className="border-b bg-gradient-to-b from-brand-soft/60 to-background">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
              <span className="size-2 rounded-full bg-brand" /> September 2026: one body, 15 logo spots, $112,062 in 48 hours
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Sell the space you already carry.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Last week a founder made $112,062 selling 15 logo spots on his body for one race. Stanley paid $20,000 for his glutes. He needed a 3D scan, a Stripe account and a weekend of code. You need a photo. Draw the spots, name the price, brands pay at checkout.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={user?.role === "creator" ? "/sell/new" : "/signup?role=creator"}>
                  Put a price on your outfit <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/listings">See what&apos;s for sale</Link>
              </Button>
            </div>
            {hasRealSales ? (
              <dl className="grid grid-cols-3 gap-4 pt-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Spots for sale</dt>
                  <dd className="text-2xl font-semibold tabular-nums">{stats.liveSpots}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Spots sold</dt>
                  <dd className="text-2xl font-semibold tabular-nums">{stats.spotsSold}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Paid to creators</dt>
                  <dd className="text-2xl font-semibold tabular-nums">{formatMoney(stats.volumeCents, { compact: true })}</dd>
                </div>
              </dl>
            ) : (
              <div className="pt-2">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">What people have paid for a logo on a person</p>
                <ul className="grid gap-3 text-sm sm:grid-cols-2">
                  {PRECEDENTS.map((p) => (
                    <li key={p.price} className="rounded-xl border bg-background/70 p-3">
                      <p className="text-xl font-semibold tabular-nums">{p.price}</p>
                      <p className="text-foreground">{p.what}</p>
                      <p className="text-xs text-muted-foreground">{p.when}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
            <ZoneOverlay
              photo={{ url: "/demo/dress-front.svg", label: "Speaker dress", width: 800, height: 1000 }}
              interactive={false}
              className="shadow-2xl ring-1 ring-black/5"
              zones={[
                { id: "a", number: 1, label: "Front chest", x: 0.4, y: 0.34, w: 0.2, h: 0.09, status: "sold" },
                { id: "b", number: 2, label: "Waist band", x: 0.33, y: 0.55, w: 0.34, h: 0.06 },
                { id: "c", number: 3, label: "Left hip", x: 0.27, y: 0.64, w: 0.17, h: 0.12 },
                { id: "d", number: 4, label: "Right hip", x: 0.56, y: 0.64, w: 0.17, h: 0.12 },
                { id: "e", number: 5, label: "Hem strip", x: 0.26, y: 0.8, w: 0.48, h: 0.05 },
              ]}
            />
            <div className="absolute -bottom-5 -left-4 rounded-xl border bg-background p-3 shadow-lg sm:-left-8">
              <p className="text-xs text-muted-foreground">Front chest · 12 cm, on stage both days</p>
              <p className="text-lg font-semibold tabular-nums">$2,800</p>
              <p className="text-xs text-emerald-600">Sold · paid up front, 4 spots still open</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="mb-10 max-w-2xl space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">Every human billboard so far had to build their own store.</h2>
          <p className="text-muted-foreground">
            The Olympian used eBay. The groom hired a tailor and wrote a website. The founder had 300 photos taken and coded a 3D model of himself. Placard takes a photo and an afternoon.
          </p>
        </div>
        <ol className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Photograph it.",
              body: "Front, back, side. The outfit, the car, the bag, the booth. Whatever will be seen by people who are not you.",
            },
            {
              title: "Draw the spots. Name the price.",
              body: "Drag a box over the chest, the sleeve, the door panel. $300 or $3,000, your call. No bidding, no haggling, no back-and-forth.",
            },
            {
              title: "Wear it. Get paid.",
              body: `The brand pays at checkout and Placard holds the money. After the event you upload proof photos, they approve, you're paid. Placard keeps ${PLATFORM_FEE_PERCENT}%.`,
            },
          ].map((s, i) => (
            <li key={s.title} className="rounded-2xl border p-6">
              <span className="mb-4 flex size-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">{i + 1}</span>
              <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y bg-muted/30">
        <div className="container-page grid gap-8 py-16 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">&ldquo;But I don&apos;t have 200,000 followers.&rdquo;</h2>
          <div className="space-y-4 text-lg text-muted-foreground">
            <p>Neither does the room, and the room is what the brand is buying.</p>
            <p>
              The companies that spent $112,062 on one man&apos;s body were not paying for his follower count. They were paying to be in every photo of him pushing a sled in front of a crowd. You&apos;re speaking to 2,000 people. You&apos;re running past 50,000. You&apos;re parked at a festival for three days.
            </p>
            <p className="font-medium text-foreground">Price the room, not your follower count.</p>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">On sale now</h2>
            <p className="text-muted-foreground">Spots you can still buy, soonest deadline first.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/listings">
              See all <ArrowRight />
            </Link>
          </Button>
        </div>
        {featured.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-background p-12 text-center">
            <Store className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">Nothing listed yet.</p>
            <p className="text-sm text-muted-foreground">The first listing sets the price for everyone after it.</p>
          </div>
        ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
      </section>

      <section className="container-page grid gap-8 pb-16 lg:grid-cols-2">
        <div className="rounded-2xl border bg-foreground p-8 text-background">
          <p className="text-xs font-medium uppercase tracking-wide text-background/60">For creators</p>
          <h3 className="mt-2 text-2xl font-semibold">You&apos;re going anyway.</h3>
          <p className="mt-2 text-background/75">
            The outfit is bought, the trip is booked, the audience is already there. The only thing missing is the invoice.
          </p>
          <Button asChild variant="secondary" className="mt-6">
            <Link href="/signup?role=creator">List what you&apos;re wearing</Link>
          </Button>
        </div>
        <div className="rounded-2xl border p-8">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">For brands</p>
          <h3 className="mt-2 text-2xl font-semibold">The one placement nobody can scroll past.</h3>
          <p className="mt-2 text-muted-foreground">
            A logo on the speaker&apos;s dress is seen by everyone in the room, photographed by half of them, and cannot be blocked or skipped. Fixed price. Pay at checkout. You approve the proof before a cent moves.
          </p>
          <Button asChild className="mt-6">
            <Link href="/signup?role=brand">Buy a spot</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
