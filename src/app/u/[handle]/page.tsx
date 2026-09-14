import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Globe, MapPin, MessageSquare, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListingStatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { getCurrentUser } from "@/lib/auth";
import { startConversation } from "@/lib/actions/messages";
import { formatDate, formatMoney, formatReach, pluralize } from "@/lib/format";
import { getProfileByHandle } from "@/lib/queries";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default async function ProfilePage({ params }: PageProps<"/u/[handle]">) {
  const [{ handle }, viewer] = await Promise.all([params, getCurrentUser()]);
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();
  const { user, stats, reviews, listings } = profile;
  const isSelf = viewer?.id === user.id;
  const message = startConversation.bind(null, user.id, undefined);

  return (
    <div className="container-page max-w-5xl space-y-10 py-10">
      <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-5">
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="size-20" />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">{user.companyName ?? user.name}</h1>
              <Badge variant="secondary">{user.role === "brand" ? "Brand" : "Creator"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              @{user.handle}
              {user.companyName && ` · ${user.name}`}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {user.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" /> {user.location}
                </span>
              )}
              {user.socialHandle && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4" /> @{user.socialHandle} · {formatReach(user.followers)} followers
                </span>
              )}
              {user.website && (
                <a href={user.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Globe className="size-4" /> {user.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
            {user.bio && <p className="max-w-xl text-sm">{user.bio}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {isSelf ? (
            <Button asChild variant="outline">
              <Link href="/settings">Edit profile</Link>
            </Button>
          ) : viewer ? (
            <form action={message}>
              <Button type="submit" variant="outline">
                <MessageSquare /> Message
              </Button>
            </form>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border p-5">
          <p className="text-sm text-muted-foreground">Rating</p>
          <p className="mt-1 text-2xl font-semibold">{stats.rating ? `${stats.rating.toFixed(1)} ★` : "New"}</p>
          <p className="text-xs text-muted-foreground">{pluralize(stats.reviewCount, "review")}</p>
        </div>
        <div className="rounded-2xl border p-5">
          <p className="text-sm text-muted-foreground">Completed deals</p>
          <p className="mt-1 text-2xl font-semibold">{stats.completedOrders}</p>
        </div>
        <div className="rounded-2xl border p-5">
          <p className="text-sm text-muted-foreground">Member since</p>
          <p className="mt-1 text-2xl font-semibold">{formatDate(user.createdAt, "MMM yyyy")}</p>
        </div>
      </div>

      {user.role === "creator" && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Listings</h2>
          {listings.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No public listings yet.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => {
                const open = l.zones.filter((z) => z.status === "open").length;
                const from = Math.min(...l.zones.map((z) => z.currentBidCents ?? z.startingPriceCents));
                return (
                  <li key={l.id}>
                    <Link href={`/listings/${l.id}`} className="flex gap-3 rounded-2xl border p-3 hover:bg-muted/40">
                      <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {l.photos[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.photos[0].url} alt="" className="size-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="line-clamp-2 text-sm font-medium">{l.title}</p>
                        <ListingStatusBadge status={l.status} />
                        <p className="text-xs text-muted-foreground">
                          {l.status === "active" ? `${open} open · from ${formatMoney(from)}` : `${pluralize(l.zones.length, "spot")}`}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No reviews yet. Reviews are written after an order is completed.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="space-y-2 rounded-2xl border p-4">
                <div className="flex items-center gap-3">
                  <UserAvatar name={r.author.name} avatarUrl={r.author.avatarUrl} className="size-8" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/u/${r.author.handle}`} className="block truncate text-sm font-medium hover:underline">
                      {r.author.companyName ?? r.author.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.order.listing.title} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={cn("size-3.5", n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
