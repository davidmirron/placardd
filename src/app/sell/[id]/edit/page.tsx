import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingForm } from "@/components/listing-form";
import { ListingStatusBadge } from "@/components/status-badge";
import { ZoneEditor, type EditorZone } from "@/components/zone-editor";
import { PhotoManager } from "./photo-manager";
import { PublishPanel } from "./publish-panel";
import { saveZones, updateListing } from "@/lib/actions/listings";
import { getCurrentUser } from "@/lib/auth";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { db } from "@/lib/db";
import { listings, photos, zones } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit listing" };

const STEPS = [
  { key: "details", label: "Details" },
  { key: "photos", label: "Photos" },
  { key: "spots", label: "Ad spots & pricing" },
] as const;

export default async function EditListingPage({ params, searchParams }: PageProps<"/sell/[id]/edit">) {
  const [{ id }, sp, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  if (!user) redirect(`/login?next=/sell/${id}/edit`);

  const listing = await db.query.listings.findFirst({ where: eq(listings.id, id) });
  if (!listing || listing.sellerId !== user.id) notFound();

  const [listingPhotos, listingZones] = await Promise.all([
    db.query.photos.findMany({ where: eq(photos.listingId, id), orderBy: asc(photos.sortOrder) }),
    db.query.zones.findMany({ where: eq(zones.listingId, id), orderBy: asc(zones.sortOrder) }),
  ]);

  const step = STEPS.some((s) => s.key === sp.step) ? (sp.step as (typeof STEPS)[number]["key"]) : "details";
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const editorZones: EditorZone[] = listingZones.map((z) => ({
    key: z.id,
    id: z.id,
    photoId: z.photoId,
    label: z.label,
    description: z.description,
    x: z.x,
    y: z.y,
    w: z.w,
    h: z.h,
    saleType: z.saleType,
    bidRule: z.bidRule,
    startingPrice: z.startingPriceCents / 100,
    minIncrement: z.minIncrementCents / 100,
    buyNowPrice: z.buyNowPriceCents != null ? z.buyNowPriceCents / 100 : null,
    locked: z.bidCount > 0 || z.status !== "open",
  }));
  const zonesVersion = listingZones.map((z) => `${z.id}:${z.bidCount}:${z.status}`).join("|");

  return (
    <div className="container-page py-10 lg:py-14">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-brand">
            Step {stepIndex + 1} of 3 · {STEPS[stepIndex].label}
          </p>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight">
            {listing.title}
            <ListingStatusBadge status={listing.status} />
          </h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/listings/${listing.id}`}>
              <Eye /> {listing.status === "draft" ? "Preview" : "View listing"}
            </Link>
          </Button>
        </div>
      </div>

      <nav className="mb-8 flex gap-1 overflow-x-auto rounded-xl bg-muted/60 p-1">
        {STEPS.map((s, i) => (
          <Link
            key={s.key}
            href={`/sell/${listing.id}/edit?step=${s.key}`}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap",
              s.key === step ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-foreground/10 text-xs">{i + 1}</span>
            {s.label}
            {s.key === "photos" && listingPhotos.length > 0 && <span className="text-xs text-muted-foreground">({listingPhotos.length})</span>}
            {s.key === "spots" && listingZones.length > 0 && <span className="text-xs text-muted-foreground">({listingZones.length})</span>}
          </Link>
        ))}
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {step === "details" && (
            <div className="max-w-3xl">
              <ListingForm action={updateListing.bind(null, listing.id)} listing={listing} submitLabel="Save details" />
              <div className="mt-6">
                <Button asChild variant="outline">
                  <Link href={`/sell/${listing.id}/edit?step=photos`}>
                    Next: photos <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          )}
          {step === "photos" && (
            <div className="space-y-6">
              <PhotoManager listingId={listing.id} photos={listingPhotos.map((p) => ({ id: p.id, url: p.url, label: p.label, width: p.width, height: p.height }))} />
              {listingPhotos.length === 0 ? (
                <Button variant="outline" disabled>
                  Next: draw ad spots <ArrowRight />
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href={`/sell/${listing.id}/edit?step=spots`}>
                    Next: draw ad spots <ArrowRight />
                  </Link>
                </Button>
              )}
            </div>
          )}
          {step === "spots" && (
            <ZoneEditor
              key={zonesVersion}
              photos={listingPhotos.map((p) => ({ id: p.id, url: p.url, label: p.label, width: p.width, height: p.height }))}
              initialZones={editorZones}
              onSave={saveZones.bind(null, listing.id)}
              feePercent={PLATFORM_FEE_PERCENT}
            />
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <PublishPanel listingId={listing.id} status={listing.status} photoCount={listingPhotos.length} zoneCount={listingZones.length} hasBids={listingZones.some((z) => z.bidCount > 0)} />
        </aside>
      </div>
    </div>
  );
}
