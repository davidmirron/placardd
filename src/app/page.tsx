import Link from "next/link";
import { ArrowRight, Camera, ShoppingBag, ShieldCheck, Sparkles, Store, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { ZoneOverlay } from "@/components/zone-overlay";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { getFeaturedListings, getMarketplaceStats } from "@/lib/queries";

export default async function HomePage() {
  const [featured, stats, user] = await Promise.all([getFeaturedListings(6), getMarketplaceStats(), getCurrentUser()]);

  return (
    <div>
      <section className="border-b bg-gradient-to-b from-brand-soft/60 to-background">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
              <Sparkles className="size-3.5 text-brand" /> Sponsorships for everyone, not just athletes
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Sell the space you already carry.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Placard is the marketplace for on-body and physical sponsorships. Photograph your outfit, car, bag or booth, draw the ad spots, name your price, and brands buy them for the event you&apos;re heading to.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={user?.role === "creator" ? "/sell/new" : "/signup?role=creator"}>
                  List your first spot <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/listings">Browse open spots</Link>
              </Button>
            </div>
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
        <div className="mb-10 max-w-2xl space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
          <p className="text-muted-foreground">Old-school sponsorships take agents and months. Placard takes a photo and an afternoon.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Camera,
              title: "Photograph and map",
              body: "Upload front, back and side photos of whatever will be seen. Draw rectangles on the exact spots you're offering and put a price on each one.",
            },
            {
              icon: ShoppingBag,
              title: "Brands buy",
              body: "A brand picks a spot and pays at checkout. No bidding, no back-and-forth, no waiting to find out — the spot is theirs the moment payment clears.",
            },
            {
              icon: ShieldCheck,
              title: "Prove it, get paid",
              body: "Placard holds the money. After the event you upload proof photos, the brand approves, and your payout is released. You see exactly what you'll earn before you publish.",
            },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border p-6">
              <s.icon className="mb-4 size-6 text-brand" />
              <h3 className="mb-2 font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="container-page py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight">Closing soon</h2>
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
              <p className="font-medium">No live listings yet</p>
              <p className="text-sm text-muted-foreground">Be the first to list a spot and set the tone for the marketplace.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="container-page grid gap-8 py-16 lg:grid-cols-2">
        <div className="rounded-2xl border bg-foreground p-8 text-background">
          <Wallet className="mb-4 size-6 text-brand" />
          <h3 className="text-2xl font-semibold">For creators</h3>
          <p className="mt-2 text-background/75">
            Speaking at a conference, running a marathon, driving to a festival? You already have the audience. Turn it into income with zero cold outreach.
          </p>
          <Button asChild variant="secondary" className="mt-6">
            <Link href="/signup?role=creator">Create a creator account</Link>
          </Button>
        </div>
        <div className="rounded-2xl border p-8">
          <Store className="mb-4 size-6 text-brand" />
          <h3 className="text-2xl font-semibold">For brands</h3>
          <p className="mt-2 text-muted-foreground">
            Buy hyper-targeted visibility inside the exact room your customers are in. Fixed prices, pay at checkout, and proof of delivery before the creator is paid.
          </p>
          <Button asChild className="mt-6">
            <Link href="/signup?role=brand">Create a brand account</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
