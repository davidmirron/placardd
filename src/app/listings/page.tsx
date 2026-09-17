import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { ListingFilters } from "./listing-filters";
import { parseFilters, searchListings } from "@/lib/queries";
import { pluralize } from "@/lib/format";

export const metadata: Metadata = { title: "Browse spots" };

export default async function ListingsPage({ searchParams }: PageProps<"/listings">) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const results = await searchListings(filters);
  const hasFilters = Boolean(filters.q || filters.eventType || filters.category || filters.location || filters.minPrice || filters.maxPrice || filters.minReach);

  return (
    <div className="container-page py-10">
      <div className="mb-6 space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Browse ad spots</h1>
        <p className="text-muted-foreground">Fixed-price ad spots on people, cars, bags and booths at upcoming events. Pick one, pay, done.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <ListingFilters filters={filters} />
        </aside>

        <section>
          <p className="mb-4 text-sm text-muted-foreground">{pluralize(results.length, "listing")}</p>
          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center">
              <SearchX className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="font-medium">{hasFilters ? "Nothing matches those filters" : "No live listings right now"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasFilters ? "Try widening the price range or clearing the search." : "Check back soon, or list a spot yourself."}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                {hasFilters && (
                  <Button asChild variant="outline">
                    <Link href="/listings">Clear filters</Link>
                  </Button>
                )}
                <Button asChild>
                  <Link href="/sell/new">List a spot</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
