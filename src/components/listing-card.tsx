import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/countdown";
import { UserAvatar } from "@/components/user-avatar";
import { AUCTIONS_ENABLED, EVENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatMoney, formatReach, pluralize } from "@/lib/format";
import type { ListingSummary } from "@/lib/queries";

export function ListingCard({ listing }: { listing: ListingSummary }) {
  const photo = listing.photos[0];
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt={listing.title} className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">No photo yet</div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge className="bg-white/90 text-foreground backdrop-blur">{EVENT_TYPE_LABELS[listing.eventType]}</Badge>
        </div>
        <div className="absolute right-3 bottom-3 rounded-full bg-black/75 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
          <Countdown endsAt={listing.soonestEnd} compact className="text-white" /> left
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h3 className="line-clamp-2 leading-snug font-semibold">{listing.title}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {listing.eventName && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" /> {listing.eventName}
                {listing.eventDate && ` · ${formatDate(listing.eventDate, "MMM d")}`}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {listing.location}
            </span>
          </div>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {listing.openSpots > 0 ? `${pluralize(listing.openSpots, "spot")} from` : "All spots taken"}
            </p>
            {listing.fromCents != null && <p className="text-lg font-semibold tabular-nums">{formatMoney(listing.fromCents)}</p>}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p className="inline-flex items-center gap-1">
              <Users className="size-3.5" /> {formatReach(listing.reach)} reach
            </p>
            <p>{AUCTIONS_ENABLED ? pluralize(listing.bidCount, "bid") : `${listing.soldSpots} of ${listing.totalSpots} sold`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          <UserAvatar name={listing.seller.name} avatarUrl={listing.seller.avatarUrl} className="size-6" />
          <span className="truncate">{listing.seller.name}</span>
          <span className="ml-auto">{formatReach(listing.seller.followers)} followers</span>
        </div>
      </div>
    </Link>
  );
}
