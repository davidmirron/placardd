import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Camera, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/countdown";
import { ListingStatusBadge, OrderStatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { AUCTIONS_ENABLED, PROOF_REVIEW_WINDOW_MS } from "@/lib/constants";
import { formatDate, formatMoney, pluralize } from "@/lib/format";
import { getBrandDashboard, getCreatorDashboard, getUnreadMessageCount } from "@/lib/queries";

export const metadata: Metadata = { title: "Dashboard" };

/** Things that aren't orders but still deserve a glance: new messages, a missing profile photo. */
async function Nudges({ userId, hasAvatar }: { userId: string; hasAvatar: boolean }) {
  const unread = await getUnreadMessageCount(userId);
  if (unread === 0 && hasAvatar) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {unread > 0 && (
        <Link href="/messages" className="flex items-center gap-3 rounded-2xl border border-brand/40 bg-brand-soft/40 px-4 py-3 text-sm hover:bg-brand-soft/70">
          <MessageSquare className="size-5 shrink-0 text-brand" />
          <span className="flex-1">
            <span className="font-medium">{pluralize(unread, "new message")}</span>
            <span className="text-muted-foreground"> waiting in your inbox</span>
          </span>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      )}
      {!hasAvatar && (
        <Link href="/settings" className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm hover:bg-muted/50">
          <Camera className="size-5 shrink-0 text-muted-foreground" />
          <span className="flex-1">
            <span className="font-medium">Add a profile photo</span>
            <span className="text-muted-foreground"> — people deal with faces, not initials</span>
          </span>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const [user, sp] = await Promise.all([requireUser("/dashboard"), searchParams]);
  return (
    <div className="container-page space-y-8 py-10">
      {sp.wrong_role && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          That page is for {user.role === "brand" ? "creator" : "brand"} accounts. Here&apos;s your dashboard instead.
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{user.role === "brand" ? "Brand dashboard" : "Creator dashboard"}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Hi, {user.name.split(" ")[0]}</h1>
        </div>
        {user.role === "creator" ? (
          <Button asChild>
            <Link href="/sell/new">
              <Plus /> New listing
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/listings">
              Browse spots <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
      <Nudges userId={user.id} hasAvatar={!!user.avatarUrl} />
      {user.role === "creator" ? <CreatorDashboard userId={user.id} /> : <BrandDashboard userId={user.id} />}
    </div>
  );
}

async function CreatorDashboard({ userId }: { userId: string }) {
  const data = await getCreatorDashboard(userId);
  const needsProof = data.orders.filter((o) => o.status === "paid" || o.status === "disputed");
  const awaitingApproval = data.orders.filter((o) => o.status === "proof_submitted");
  const live = data.listings.filter((l) => l.status === "active");
  const openSpots = live.reduce((n, l) => n + l.zones.filter((z) => z.status === "open").length, 0);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Live listings" value={String(live.length)} hint={AUCTIONS_ENABLED ? pluralize(data.liveBids, "active bid") : `${pluralize(openSpots, "spot")} for sale`} />
        <Stat label="Your earnings" value={formatMoney(data.earnings)} hint={`${formatMoney(data.released)} released · ${formatMoney(data.earnings - data.released)} held until proof is approved`} />
        <Stat label="Orders needing proof" value={String(needsProof.length)} hint={needsProof.length ? "Upload proof to release payouts" : "Nothing waiting on you"} />
      </div>

      {needsProof.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Action needed</h2>
          <ul className="divide-y rounded-2xl border">
            {needsProof.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-medium">
                    {o.zone.label} · {o.listing.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {o.status === "disputed"
                      ? `${o.buyer.companyName ?? o.buyer.name} flagged an issue · respond to release ${formatMoney(o.sellerNetCents)}`
                      : `${o.buyer.companyName ?? o.buyer.name} paid · you earn ${formatMoney(o.sellerNetCents)} once proof is approved`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={o.status} />
                  <Button asChild size="sm">
                    <Link href={`/orders/${o.id}`}>{o.status === "disputed" ? "Respond" : "Upload proof"}</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {awaitingApproval.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Waiting on the brand</h2>
          <ul className="divide-y rounded-2xl border">
            {awaitingApproval.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-medium">
                    {o.zone.label} · {o.listing.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Proof sent {formatDate(o.proofSubmittedAt)} · {formatMoney(o.sellerNetCents)} releases automatically on{" "}
                    {formatDate(o.proofSubmittedAt ? o.proofSubmittedAt.getTime() + PROOF_REVIEW_WINDOW_MS : null)} if {o.buyer.companyName ?? o.buyer.name} doesn&apos;t respond
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={o.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/orders/${o.id}`}>Open</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Your listings</h2>
        {data.listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <p className="font-medium">No listings yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Photograph what you&apos;ll wear, drive or carry at your next event and put a price on the spots.</p>
            <Button asChild className="mt-4">
              <Link href="/sell/new">Create your first listing</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {data.listings.map((l) => {
              const open = l.zones.filter((z) => z.status === "open");
              const sold = l.zones.filter((z) => z.status === "sold");
              const value = AUCTIONS_ENABLED ? l.zones.reduce((s, z) => s + (z.currentBidCents ?? 0), 0) : sold.reduce((s, z) => s + (z.currentBidCents ?? z.startingPriceCents), 0);
              return (
                <li key={l.id} className="flex gap-4 rounded-2xl border p-4">
                  <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {l.photos[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.photos[0].url} alt="" className="size-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/listings/${l.id}`} className="line-clamp-2 font-medium hover:underline">
                        {l.title}
                      </Link>
                      <ListingStatusBadge status={l.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pluralize(l.zones.length, "spot")} · {open.length} open · {sold.length} sold
                    </p>
                    <p className="text-sm">
                      {AUCTIONS_ENABLED ? "Bids so far: " : "Sold so far: "}
                      <span className="font-medium tabular-nums">{formatMoney(value)}</span>
                      {l.status === "active" && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {AUCTIONS_ENABLED ? "closes" : "available for"} <Countdown endsAt={l.biddingEndsAt} compact />
                        </span>
                      )}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button asChild size="xs" variant="outline">
                        <Link href={`/sell/${l.id}/edit`}>Edit</Link>
                      </Button>
                      <Button asChild size="xs" variant="ghost">
                        <Link href={`/listings/${l.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <OrdersTable
        title="Orders"
        empty={AUCTIONS_ENABLED ? "Orders appear here when a brand wins or buys one of your spots." : "Orders appear here when a brand buys one of your spots."}
        rows={data.orders.map((o) => ({
          id: o.id,
          title: `${o.zone.label} · ${o.listing.title}`,
          counterparty: o.buyer.companyName ?? o.buyer.name,
          amount: o.sellerNetCents,
          amountLabel: "You earn",
          status: o.status,
          date: o.createdAt,
        }))}
      />
    </>
  );
}

async function BrandDashboard({ userId }: { userId: string }) {
  const data = await getBrandDashboard(userId);
  const toPay = data.orders.filter((o) => o.status === "pending_payment");
  const toReview = data.orders.filter((o) => o.status === "proof_submitted");
  const disputed = data.orders.filter((o) => o.status === "disputed");
  const liveBids = data.bidZones.filter((z) => z.status === "open");
  const leading = liveBids.filter((z) => z.currentBidderId === userId);
  const activeOrders = data.orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
  const awaiting = toPay.length + toReview.length + disputed.length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {AUCTIONS_ENABLED ? (
          <Stat label="Live bids" value={String(liveBids.length)} hint={`Leading on ${leading.length}, outbid on ${liveBids.length - leading.length}`} />
        ) : (
          <Stat label="Spots bought" value={String(activeOrders.length)} hint={activeOrders.length ? `${pluralize(activeOrders.filter((o) => o.status === "completed").length, "deal")} completed` : "Browse spots to buy your first"} />
        )}
        <Stat label="Total spend" value={formatMoney(data.spend)} hint="Paid orders" />
        <Stat label="Awaiting you" value={String(awaiting)} hint={toPay.length ? `${pluralize(toPay.length, "order")} to pay` : toReview.length ? "Proof to approve" : disputed.length ? "Open issue to resolve" : "All caught up"} />
      </div>

      {awaiting > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Action needed</h2>
          <ul className="divide-y rounded-2xl border">
            {[...toPay, ...toReview, ...disputed].map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-medium">
                    {o.zone.label} · {o.listing.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(o.amountCents)} · {o.seller.name}
                    {o.status === "proof_submitted" && o.proofSubmittedAt && (
                      <> · approve or flag by {formatDate(o.proofSubmittedAt.getTime() + PROOF_REVIEW_WINDOW_MS)}, after that payment releases automatically</>
                    )}
                    {o.status === "disputed" && <> · you flagged an issue, waiting on the creator</>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={o.status} />
                  <Button asChild size="sm" variant={o.status === "disputed" ? "outline" : "default"}>
                    <Link href={`/orders/${o.id}`}>{o.status === "pending_payment" ? "Pay now" : o.status === "proof_submitted" ? "Review proof" : "Open"}</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {AUCTIONS_ENABLED && (
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Your bids</h2>
        {data.bidZones.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <p className="font-medium">You haven&apos;t bid on anything yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Find a creator heading to the room your customers are in.</p>
            <Button asChild className="mt-4">
              <Link href="/listings">Browse live spots</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y rounded-2xl border">
            {data.bidZones.map((z) => {
              const isLeading = z.currentBidderId === userId;
              const won = z.order?.buyerId === userId;
              return (
                <li key={z.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <Link href={`/listings/${z.listing.id}`} className="font-medium hover:underline">
                      {z.label} · {z.listing.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {z.status === "open" ? (
                        <>
                          Current {formatMoney(z.currentBidCents ?? z.startingPriceCents)} · closes in <Countdown endsAt={z.endsAt} compact />
                        </>
                      ) : won ? (
                        `Won at ${formatMoney(z.currentBidCents ?? 0)}`
                      ) : z.status === "sold" ? (
                        "Won by another brand"
                      ) : (
                        "Auction ended"
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {z.status === "open" ? (
                      <span className={isLeading ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900" : "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900"}>
                        {isLeading ? "Leading" : "Outbid"}
                      </span>
                    ) : won && z.order ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/orders/${z.order.id}`}>Open order</Link>
                      </Button>
                    ) : null}
                    {z.status === "open" && !isLeading && (
                      <Button asChild size="sm">
                        <Link href={`/listings/${z.listing.id}`}>Bid again</Link>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      )}

      <OrdersTable
        title="Orders"
        empty={AUCTIONS_ENABLED ? "Won auctions and buy-now purchases show up here." : "Spots you buy show up here. Find a creator heading to the room your customers are in."}
        rows={data.orders.map((o) => ({
          id: o.id,
          title: `${o.zone.label} · ${o.listing.title}`,
          counterparty: o.seller.name,
          amount: o.amountCents,
          amountLabel: "Paid",
          status: o.status,
          date: o.createdAt,
        }))}
      />
    </>
  );
}

function OrdersTable({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: { id: string; title: string; counterparty: string; amount: number; amountLabel: string; status: Parameters<typeof OrderStatusBadge>[0]["status"]; date: Date }[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Spot</th>
                <th className="px-4 py-2 font-medium">With</th>
                <th className="px-4 py-2 font-medium">{rows[0].amountLabel}</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="max-w-xs truncate px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3">{r.counterparty}</td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(r.amount)}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/orders/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
