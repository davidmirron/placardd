import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { ZoneOverlay } from "@/components/zone-overlay";
import { getCurrentUser } from "@/lib/auth";
import { getFeaturedListings } from "@/lib/queries";

export default async function HomePage() {
  const [featured, user] = await Promise.all([getFeaturedListings(6), getCurrentUser()]);

  return (
    <div>
      <section className="border-b bg-gradient-to-b from-brand-soft/60 to-background">
        <div className="container-page grid items-center gap-10 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div className="space-y-8">
            <h1 className="text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Sell the space you already carry.
            </h1>
            <p className="max-w-lg text-xl text-muted-foreground">Photograph what you&apos;re wearing. Draw a box. Set a price.</p>
            <Button asChild size="lg">
              <Link href={user?.role === "creator" ? "/sell/new" : "/signup?role=creator"}>
                Get started <ArrowRight />
              </Link>
            </Button>
          </div>

          <div className="mx-auto w-full max-w-sm lg:max-w-md">
            <ZoneOverlay
              photo={{ url: "/demo/dress-front.svg", label: "Speaker dress", width: 800, height: 1000 }}
              interactive={false}
              className="shadow-2xl ring-1 ring-black/5"
              zones={[
                { id: "a", number: 1, label: "Front chest", x: 0.4, y: 0.34, w: 0.2, h: 0.09 },
                { id: "b", number: 2, label: "Waist band", x: 0.33, y: 0.55, w: 0.34, h: 0.06 },
                { id: "c", number: 3, label: "Left hip", x: 0.27, y: 0.64, w: 0.17, h: 0.12 },
                { id: "d", number: 4, label: "Right hip", x: 0.56, y: 0.64, w: 0.17, h: 0.12 },
                { id: "e", number: 5, label: "Hem strip", x: 0.26, y: 0.8, w: 0.48, h: 0.05 },
              ]}
            />
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container-page py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">For sale</h2>
            <Button asChild variant="outline">
              <Link href="/listings">
                See all <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
