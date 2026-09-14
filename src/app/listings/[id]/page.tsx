import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, MessageSquare, Pencil, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListingStatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { ListingSpots } from "./listing-spots";
import { getCurrentUser } from "@/lib/auth";
import { startConversation } from "@/lib/actions/messages";
import { BID_RULE_DESCRIPTIONS, CATEGORY_LABELS, PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { formatDate, formatDateTime, formatReach, pluralize } from "@/lib/format";
import { getListingDetail } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/listings/[id]">): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingDetail(id);
  return { title: listing?.title ?? "Listing" };
}

export default async function ListingPage({ params, searchParams }: PageProps<"/listings/[id]">) {
  const [{ id }, sp, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const listing = await getListingDetail(id);
  if (!listing) notFound();
  const isOwner = user?.id === listing.sellerId;
  if (listing.status === "draft" && !isOwner) notFound();

  const includes = listing.includes.split("\n").map((s) => s.trim()).filter(Boolean);
  const rules = Array.from(new Set(listing.zones.filter((z) => z.saleType === "auction").map((z) => z.bidRule)));
  const totalReach = listing.reachInPerson + listing.reachSocial;

  const spots = listing.zones.map((z, i) => ({
    id: z.id,
    number: i + 1,
    photoId: z.photoId,
    label: z.label,
    description: z.description,
    x: z.x,
    y: z.y,
    w: z.w,
    h: z.h,
    saleType: z.saleType,
    bidRule: z.bidRule,
    startingPriceCents: z.startingPriceCents,
    minIncrementCents: z.minIncrementCents,
    buyNowPriceCents: z.buyNowPriceCents,
    currentBidCents: z.currentBidCents,
    currentBidderId: z.currentBidderId,
    currentBidderName: z.currentBidder ? z.currentBidder.companyName ?? z.currentBidder.name : null,
    bidCount: z.bidCount,
    endsAt: z.endsAt.getTime(),
    status: z.status,
    live: z.live,
    orderId: z.order?.id ?? null,
    orderBuyerId: z.order?.buyerId ?? null,
    bids: z.bids.map((b) => ({ id: b.id, amountCents: b.amountCents, at: b.createdAt.getTime(), bidder: b.bidder.companyName ?? b.bidder.name, bidderId: b.bidderId })),
  }));

  const messageSeller = startConversation.bind(null, listing.sellerId, listing.id);

  return (
    <div className="container-page py-8 lg:py-12">
      {sp.published && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Your listing is live. Share this page — every bid and outbid shows up here in real time.
        </div>
      )}
      {isOwner && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
          <span>
            This is your listing. <ListingStatusBadge status={listing.status} className="ml-1" />
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href={`/sell/${listing.id}/edit`}>
              <Pencil /> Edit listing
            </Link>
          </Button>
        </div>
      )}

      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{CATEGORY_LABELS[listing.category]}</Badge>
            {listing.status !== "active" && <ListingStatusBadge status={listing.status} />}
            {rules.includes("doubling") && <Badge className="border-transparent bg-brand text-brand-foreground">Doubling bids</Badge>}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance lg:text-4xl">{listing.title}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            {listing.eventName && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" /> {listing.eventName}
                {listing.eventDate && ` · ${formatDate(listing.eventDate)}`}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" /> {listing.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" /> {formatReach(totalReach)} est. reach
            </span>
          </div>
        </div>
        <div className="shrink-0 rounded-xl border px-4 py-3 text-sm">
          <p className="text-muted-foreground">Bidding closes</p>
          <p className="font-medium">{formatDateTime(listing.biddingEndsAt)}</p>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <ListingSpots
            listingId={listing.id}
            photos={listing.photos.map((p) => ({ id: p.id, url: p.url, label: p.label, width: p.width, height: p.height }))}
            spots={spots}
            viewer={user ? { id: user.id, role: user.role } : null}
            isOwner={isOwner}
            listingActive={listing.status === "active"}
          />

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">About this listing</h2>
            <div className="space-y-3 text-[15px] leading-relaxed whitespace-pre-line text-foreground/90">{listing.description || "No description yet."}</div>
          </section>

          {includes.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">What every sponsor gets</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {includes.map((item) => (
                  <li key={item} className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
                    <Star className="mt-0.5 size-4 shrink-0 text-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {rules.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Auction rules</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {rules.map((r) => (
                  <li key={r}>
                    <span className="font-medium text-foreground">{r === "doubling" ? "Doubling bids." : "Minimum increment."}</span> {BID_RULE_DESCRIPTIONS[r]}
                  </li>
                ))}
                <li>A bid in the final five minutes extends that spot by five minutes. Winners have 48 hours to pay.</li>
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border p-5">
            <div className="flex items-center gap-3">
              <UserAvatar name={listing.seller.name} avatarUrl={listing.seller.avatarUrl} className="size-12" />
              <div className="min-w-0">
                <Link href={`/u/${listing.seller.handle}`} className="block truncate font-semibold hover:underline">
                  {listing.seller.name}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  {listing.seller.socialHandle ? `@${listing.seller.socialHandle} · ` : ""}
                  {formatReach(listing.seller.followers)} followers
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">Rating</dt>
                <dd className="font-medium">
                  {listing.sellerStats.rating ? `${listing.sellerStats.rating.toFixed(1)} ★` : "New"}
                  {listing.sellerStats.reviewCount > 0 && <span className="text-xs text-muted-foreground"> ({listing.sellerStats.reviewCount})</span>}
                </dd>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">Completed</dt>
                <dd className="font-medium">{pluralize(listing.sellerStats.completedOrders, "deal")}</dd>
              </div>
            </dl>
            {listing.seller.bio && <p className="mt-4 text-sm text-muted-foreground">{listing.seller.bio}</p>}
            {!isOwner && (
              <form action={messageSeller} className="mt-4">
                <Button type="submit" variant="outline" className="w-full">
                  <MessageSquare /> Message {listing.seller.name.split(" ")[0]}
                </Button>
              </form>
            )}
          </div>

          <div className="rounded-2xl border p-5 text-sm">
            <h3 className="mb-2 font-semibold">Reach breakdown</h3>
            <dl className="space-y-1.5 text-muted-foreground">
              <div className="flex justify-between">
                <dt>In person</dt>
                <dd className="font-medium text-foreground">{formatReach(listing.reachInPerson)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Social</dt>
                <dd className="font-medium text-foreground">{formatReach(listing.reachSocial)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">Reach is self-reported by the creator. Verified social reach is on our roadmap.</p>
          </div>

          <div className="rounded-2xl border bg-muted/40 p-5 text-xs text-muted-foreground">
            Brands pay on winning. Placard holds the funds and releases them to the creator after proof is approved. A {PLATFORM_FEE_PERCENT}% platform fee is taken from the creator side.
          </div>
        </aside>
      </div>
    </div>
  );
}
