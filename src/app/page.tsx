import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { ZoneOverlay } from "@/components/zone-overlay";
import { getCurrentUser } from "@/lib/auth";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { getFeaturedListings, getMarketplaceStats } from "@/lib/queries";

export default async function HomePage() {
  const [featured, stats, user] = await Promise.all([getFeaturedListings(6), getMarketplaceStats(), getCurrentUser()]);
  const hasRealSales = stats.spotsSold > 0;

  return (
    <div>
      <section className="border-b bg-gradient-to-b from-brand-soft/60 to-background">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">placard</span> <span className="italic">noun</span> · a sign carried by a person.
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Sell ad space on what you&apos;re wearing.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Photograph the outfit, the car, the bag, the booth. Draw a box on every spot a logo fits. Put a price on each one. A brand pays at checkout, you wear it at the event, you get paid.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={user?.role === "creator" ? "/sell/new" : "/signup?role=creator"}>
                  Put a price on it <ArrowRight />
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
              <dl className="grid gap-4 pt-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="font-semibold text-foreground">One price per spot.</dt>
                  <dd className="text-muted-foreground">No bidding. No haggling.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">Paid at checkout.</dt>
                  <dd className="text-muted-foreground">Held until you&apos;ve worn it.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">{PLATFORM_FEE_PERCENT}% fee.</dt>
                  <dd className="text-muted-foreground">Nothing else.</dd>
                </div>
              </dl>
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
          <h2 className="text-3xl font-semibold tracking-tight text-balance">A photo. A box. A price.</h2>
          <p className="text-muted-foreground">
            No agent, no pitch deck, no six weeks of email. You list it in an afternoon and it sells while you pack.
          </p>
        </div>
        <ol className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Photograph it.",
              body: "Front, back, side. The outfit, the car, the bag, the booth. Whatever people will be looking at.",
            },
            {
              title: "Draw the spots.",
              body: "Drag a box wherever a logo fits. Chest, sleeve, door panel, booth wall. Give each one a price. $300 or $3,000, your call.",
            },
            {
              title: "Wear it. Get paid.",
              body: `The brand pays at checkout and we hold the money. After the event you upload a photo, they approve, you're paid. We keep ${PLATFORM_FEE_PERCENT}%.`,
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
          <h2 className="text-3xl font-semibold tracking-tight text-balance">You don&apos;t need followers. You need a room.</h2>
          <div className="space-y-4 text-lg text-muted-foreground">
            <p>
              Twenty minutes on a stage in front of 2,000 people. Four hours running past 50,000. Three days parked at the festival gate. Someone is always looking at you. Until now, nobody paid for it.
            </p>
            <p>Brands aren&apos;t buying your feed. They&apos;re buying the room you&apos;re already standing in.</p>
            <p className="font-medium text-foreground">Price the room.</p>
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
