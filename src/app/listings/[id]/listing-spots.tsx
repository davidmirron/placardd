"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import { Gavel, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Countdown } from "@/components/countdown";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { ZoneStatusBadge } from "@/components/status-badge";
import { ZoneOverlay } from "@/components/zone-overlay";
import { buyNowAction, placeBidAction } from "@/lib/actions/bids";
import { AUCTIONS_ENABLED, BID_RULE_LABELS } from "@/lib/constants";
import type { BidRule, SaleType, ZoneStatus } from "@/lib/db/schema";
import { formatMoney, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SpotView = {
  id: string;
  number: number;
  photoId: string;
  label: string;
  description: string;
  x: number;
  y: number;
  w: number;
  h: number;
  saleType: SaleType;
  bidRule: BidRule;
  startingPriceCents: number;
  minIncrementCents: number;
  buyNowPriceCents: number | null;
  currentBidCents: number | null;
  currentBidderId: string | null;
  currentBidderName: string | null;
  bidCount: number;
  endsAt: number;
  status: ZoneStatus;
  live: boolean;
  orderId: string | null;
  orderBuyerId: string | null;
  bids: { id: string; amountCents: number; at: number; bidder: string; bidderId: string }[];
};

type Photo = { id: string; url: string; label: string; width: number; height: number };
type Viewer = { id: string; role: "creator" | "brand" } | null;

function minimumNextBid(s: SpotView) {
  if (s.currentBidCents == null) return s.startingPriceCents;
  return s.bidRule === "doubling" ? s.currentBidCents * 2 : s.currentBidCents + s.minIncrementCents;
}

// Mirrors buyNowPrice in lib/auctions.ts for display; the server re-validates on submit.
function buyNowPrice(s: SpotView) {
  if (s.saleType === "buy_now") return s.startingPriceCents;
  if (!AUCTIONS_ENABLED) return s.buyNowPriceCents ?? s.startingPriceCents;
  if (s.buyNowPriceCents == null) return null;
  if (s.currentBidCents != null && s.currentBidCents >= s.buyNowPriceCents) return null;
  return s.buyNowPriceCents;
}

export function ListingSpots({
  listingId,
  photos,
  spots,
  viewer,
  isOwner,
  listingActive,
}: {
  listingId: string;
  photos: Photo[];
  spots: SpotView[];
  viewer: Viewer;
  isOwner: boolean;
  listingActive: boolean;
}) {
  const [photoId, setPhotoId] = useState(photos[0]?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const photo = photos.find((p) => p.id === photoId) ?? photos[0];
  const zonesOnPhoto = useMemo(() => spots.filter((s) => s.photoId === photo?.id), [spots, photo?.id]);

  const selectSpot = (id: string, scroll = true) => {
    setSelectedId(id);
    const spot = spots.find((s) => s.id === id);
    if (spot && spot.photoId !== photo?.id) setPhotoId(spot.photoId);
    if (scroll) cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  if (photos.length === 0) {
    return <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">No photos have been added to this listing yet.</div>;
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_88px]">
        <ZoneOverlay
          photo={photo!}
          zones={zonesOnPhoto.map((s) => ({ id: s.id, number: s.number, label: s.label, x: s.x, y: s.y, w: s.w, h: s.h, status: s.status }))}
          selectedId={selectedId}
          onSelect={(id) => selectSpot(id)}
          className="ring-1 ring-black/5"
        />
        {photos.length > 1 && (
          <div className="flex gap-2 md:flex-col">
            {photos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPhotoId(p.id)}
                className={cn("relative aspect-square w-20 overflow-hidden rounded-lg border-2 md:w-full", p.id === photo?.id ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100")}
                aria-label={`Show ${p.label}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.label} className="size-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[10px] text-white">{p.label}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{pluralize(spots.length, "ad spot")}</h2>
          <p className="text-sm text-muted-foreground">Tap a spot on the photo to jump to it</p>
        </div>
        {spots.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No spots mapped yet.</p>
        ) : (
          <div className="grid gap-4">
            {spots.map((s) => (
              <div
                key={s.id}
                ref={(el) => {
                  cardRefs.current[s.id] = el;
                }}
              >
                <SpotCard spot={s} listingId={listingId} viewer={viewer} isOwner={isOwner} listingActive={listingActive} selected={s.id === selectedId} onSelect={() => selectSpot(s.id, false)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SpotCard({
  spot,
  listingId,
  viewer,
  isOwner,
  listingActive,
  selected,
  onSelect,
}: {
  spot: SpotView;
  listingId: string;
  viewer: Viewer;
  isOwner: boolean;
  listingActive: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const live = spot.live && listingActive;
  // A legacy auction spot is shown as a plain purchase when auctions are switched off.
  const isAuction = AUCTIONS_ENABLED && spot.saleType === "auction";
  const minBid = minimumNextBid(spot);
  const instant = buyNowPrice(spot);
  const leading = isAuction && viewer && spot.currentBidderId === viewer.id;
  const wonByViewer = viewer && spot.orderBuyerId === viewer.id;
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div
      onClick={onSelect}
      className={cn("rounded-2xl border p-5 transition-colors", selected ? "border-brand ring-2 ring-brand/30" : "hover:border-foreground/30")}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold", selected ? "bg-brand text-brand-foreground" : "bg-foreground text-background")}>
            {spot.number}
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{spot.label}</h3>
              {spot.status !== "open" && <ZoneStatusBadge status={spot.status} />}
              {isAuction && <span className="text-xs text-muted-foreground">{BID_RULE_LABELS[spot.bidRule]}</span>}
            </div>
            {spot.description && <p className="text-sm text-muted-foreground">{spot.description}</p>}
            {isAuction && (
              <p className="text-xs text-muted-foreground">
                {pluralize(spot.bidCount, "bid")}
                {spot.currentBidderName && ` · leading: ${spot.currentBidderName}`}
                {spot.bidCount > 0 && (
                  <button
                    type="button"
                    className="ml-2 underline underline-offset-2 hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHistory((v) => !v);
                    }}
                  >
                    {showHistory ? "Hide history" : "History"}
                  </button>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          {isAuction ? (
            <>
              <p className="text-xs text-muted-foreground">{spot.currentBidCents != null ? "Current bid" : "Starting bid"}</p>
              <p className="text-2xl font-semibold tabular-nums">{formatMoney(spot.currentBidCents ?? spot.startingPriceCents)}</p>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Price</p>
              <p className="text-2xl font-semibold tabular-nums">{formatMoney(instant ?? spot.startingPriceCents)}</p>
            </>
          )}
          {spot.status === "open" && (
            <p className="text-xs text-muted-foreground">
              <Countdown endsAt={spot.endsAt} compact endedLabel="Closing…" /> left
            </p>
          )}
        </div>
      </div>

      {isAuction && showHistory && spot.bids.length > 0 && (
        <ul className="mt-4 divide-y rounded-lg border text-sm">
          {spot.bids.map((b) => (
            <li key={b.id} className="flex items-center justify-between px-3 py-1.5">
              <span className={cn(viewer && b.bidderId === viewer.id && "font-medium")}>{viewer && b.bidderId === viewer.id ? "You" : b.bidder}</span>
              <span className="tabular-nums">{formatMoney(b.amountCents)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t pt-4">
        {spot.status === "sold" ? (
          <p className="text-sm text-muted-foreground">
            {wonByViewer ? (
              <>
                You won this spot.{" "}
                {spot.orderId && (
                  <Link href={`/orders/${spot.orderId}`} className="font-medium text-foreground underline underline-offset-4">
                    Open your order
                  </Link>
                )}
              </>
            ) : isOwner && spot.orderId ? (
              <>
                Sold to {spot.currentBidderName ?? "a brand"} for {formatMoney(spot.currentBidCents ?? 0)}.{" "}
                <Link href={`/orders/${spot.orderId}`} className="font-medium text-foreground underline underline-offset-4">
                  View order
                </Link>
              </>
            ) : (
              <>Sold to {spot.currentBidderName ?? "a brand"}.</>
            )}
          </p>
        ) : !live ? (
          <p className="text-sm text-muted-foreground">{spot.status === "open" && isAuction ? "Bidding on this spot has closed." : "This spot is no longer available."}</p>
        ) : isOwner ? (
          <p className="text-sm text-muted-foreground">
            {isAuction ? `Next bid must be at least ${formatMoney(minBid)}.` : "Waiting for a brand to buy this spot."}
          </p>
        ) : !viewer ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{isAuction ? `Next bid from ${formatMoney(minBid)}` : "Available now · pay at checkout"}</span>
            <Button asChild size="sm">
              <Link href={`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`}>Sign in to {isAuction ? "bid" : "buy"}</Link>
            </Button>
          </div>
        ) : viewer.role !== "brand" ? (
          <p className="text-sm text-muted-foreground">Only brand accounts can {isAuction ? "bid or " : ""}buy. Create a brand account to take part.</p>
        ) : (
          <BidControls key={`${minBid}-${instant ?? 0}`} spot={spot} listingId={listingId} minBid={minBid} instant={instant} leading={!!leading} isAuction={isAuction} />
        )}
      </div>
    </div>
  );
}

function BidControls({
  spot,
  listingId,
  minBid,
  instant,
  leading,
  isAuction,
}: {
  spot: SpotView;
  listingId: string;
  minBid: number;
  instant: number | null;
  leading: boolean;
  isAuction: boolean;
}) {
  const [bidState, bidAction] = useActionState(placeBidAction, undefined);
  const [buyState, buyAction] = useActionState(buyNowAction, undefined);
  const [amount, setAmount] = useState(String(minBid / 100));

  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      {leading && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          You&apos;re the highest bidder. We&apos;ll show it here if you get outbid.
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {isAuction && !leading && (
          <form action={bidAction} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="zoneId" value={spot.id} />
            <input type="hidden" name="listingId" value={listingId} />
            <div className="flex-1 space-y-1">
              <label htmlFor={`bid-${spot.id}`} className="text-xs text-muted-foreground">
                Your bid (min {formatMoney(minBid)})
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">$</span>
                <Input id={`bid-${spot.id}`} name="amount" type="number" inputMode="decimal" min={minBid / 100} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-7" required />
              </div>
            </div>
            <SubmitButton pendingText="Placing bid…">
              <Gavel /> {spot.bidRule === "doubling" ? "Double it" : "Place bid"}
            </SubmitButton>
          </form>
        )}
        {!isAuction && <p className="text-sm text-muted-foreground">You&apos;ll be taken to checkout. The spot is yours once payment clears.</p>}
        {instant != null && (
          <form action={buyAction}>
            <input type="hidden" name="zoneId" value={spot.id} />
            <input type="hidden" name="listingId" value={listingId} />
            <SubmitButton variant={isAuction ? "outline" : "default"} pendingText="Heading to checkout…">
              <Zap /> Buy now {formatMoney(instant)}
            </SubmitButton>
          </form>
        )}
      </div>
      <FormMessage state={bidState ?? buyState} />
    </div>
  );
}
