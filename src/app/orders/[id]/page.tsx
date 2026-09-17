import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/status-badge";
import { ProtectedByPlacard } from "@/components/protected-by-placard";
import { UserAvatar } from "@/components/user-avatar";
import { ZoneOverlay } from "@/components/zone-overlay";
import { FileGrid } from "@/components/file-grid";
import { AssetsPanel, DisputePanel, FlagIssueLink, PayPanel, ProofPanel, ProofSentPanel, RefundForm, ReviewPanel, ReviewProofPanel } from "./order-panels";
import { requireUser } from "@/lib/auth";
import { startConversation } from "@/lib/actions/messages";
import { ORDER_STATUS_LABELS, PROOF_REVIEW_WINDOW_MS } from "@/lib/constants";
import type { OrderStatus } from "@/lib/db/schema";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { activeProvider, confirmStripeSession } from "@/lib/payments";
import { getOrderForUser } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Order" };

const TIMELINE: OrderStatus[] = ["pending_payment", "paid", "proof_submitted", "completed"];

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/orders/${id}`);
  if (typeof sp.session_id === "string") {
    await confirmStripeSession(sp.session_id).catch(() => undefined);
  }
  const order = await getOrderForUser(id, user.id);
  if (!order) notFound();

  const isBuyer = order.buyerId === user.id;
  const counterpart = isBuyer ? order.seller : order.buyer;
  const counterpartName = counterpart.companyName ?? counterpart.name;
  const assets = order.files.filter((f) => f.kind === "asset");
  const proofs = order.files.filter((f) => f.kind === "proof");
  const proofFiles = proofs.map((f) => ({ id: f.id, url: f.url, mime: f.mime, note: f.note }));
  const showProofGallery = proofs.length > 0 && (isBuyer || (order.status !== "paid" && order.status !== "disputed"));
  const proofsInReviewPanel = isBuyer && order.status === "proof_submitted";
  const myReview = order.reviews.find((r) => r.authorId === user.id);
  const theirReview = order.reviews.find((r) => r.authorId !== user.id);
  const stageIndex = TIMELINE.indexOf(order.status);
  const reviewDeadline = order.proofSubmittedAt ? new Date(order.proofSubmittedAt.getTime() + PROOF_REVIEW_WINDOW_MS) : null;
  const message = startConversation.bind(null, counterpart.id, order.listingId);
  const closed = order.status === "cancelled" || order.status === "refunded";

  return (
    <div className="container-page max-w-5xl space-y-8 py-10">
      {sp.won && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          You got the spot. Complete payment to lock it in, then upload your logo and placement notes.
        </div>
      )}
      {sp.paid && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Payment received. Placard holds the funds until you approve proof of delivery.
        </div>
      )}
      {sp.cancelled && order.status === "pending_payment" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Checkout was cancelled. The spot is held for you for a short while — pay below to keep it, or it goes back on sale.
        </div>
      )}

      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Order {order.id}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{order.zone.label}</h1>
          <p className="text-muted-foreground">
            on{" "}
            <Link href={`/listings/${order.listingId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
              {order.listing.title}
            </Link>
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {order.listing.eventName && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" /> {order.listing.eventName}
                {order.listing.eventDate && ` · ${formatDate(order.listing.eventDate)}`}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" /> {order.listing.location}
            </span>
          </div>
        </div>
        <OrderStatusBadge status={order.status} className="h-7 px-3 text-sm" />
      </header>

      {!closed && order.status !== "disputed" && (
        <ol className="grid grid-cols-4 gap-2">
          {TIMELINE.map((s, i) => (
            <li key={s} className="space-y-1.5">
              <div className={cn("h-1.5 rounded-full", i <= stageIndex ? "bg-brand" : "bg-muted")} />
              <p className={cn("text-xs", i <= stageIndex ? "font-medium" : "text-muted-foreground")}>{ORDER_STATUS_LABELS[s].split(" · ")[0]}</p>
            </li>
          ))}
        </ol>
      )}

      {order.status === "refunded" && (
        <div className="rounded-xl border bg-muted/40 p-4 text-sm">
          <p className="font-medium">This order was refunded {formatDate(order.refundedAt)}.</p>
          <p className="mt-1 text-muted-foreground">
            {isBuyer
              ? `${formatMoney(order.amountCents)} has been returned to your original payment method. Refunds usually show up within 5–10 business days.`
              : `${formatMoney(order.amountCents)} was returned to ${counterpartName}. The spot went back on sale if the listing was still open.`}
          </p>
          {order.disputeReason && <p className="mt-2 text-muted-foreground whitespace-pre-line">{order.disputeReason}</p>}
        </div>
      )}
      {order.status === "cancelled" && (
        <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">This order was cancelled before payment. No money changed hands and the spot went back on sale.</div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          {isBuyer && order.status === "pending_payment" && <PayPanel orderId={order.id} amountCents={order.amountCents} provider={activeProvider()} />}
          {!isBuyer && order.status === "pending_payment" && (
            <div className="rounded-2xl border p-5 text-sm text-muted-foreground">Waiting for {counterpartName} to pay. You&apos;ll be able to upload proof once payment lands.</div>
          )}

          {order.status === "disputed" && (
            <DisputePanel
              orderId={order.id}
              isBuyer={isBuyer}
              reason={order.disputeReason ?? ""}
              flaggedAt={order.disputedAt}
              counterpartName={counterpartName}
              amountCents={order.amountCents}
              messageAction={message}
            />
          )}

          {!isBuyer && (order.status === "paid" || order.status === "disputed") && (
            <ProofPanel orderId={order.id} proofs={proofFiles} disputed={order.status === "disputed"} />
          )}
          {!isBuyer && order.status === "proof_submitted" && order.proofSubmittedAt && reviewDeadline && (
            <ProofSentPanel submittedAt={order.proofSubmittedAt} deadline={reviewDeadline} brandName={counterpartName} payoutCents={order.sellerNetCents} />
          )}
          {isBuyer && order.status === "proof_submitted" && reviewDeadline && (
            <ReviewProofPanel
              orderId={order.id}
              deadline={reviewDeadline}
              creatorName={counterpartName}
              proofs={proofFiles}
              submittedAt={order.proofSubmittedAt}
            />
          )}

          {showProofGallery && !proofsInReviewPanel && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Proof of delivery</h2>
              <FileGrid files={proofFiles} />
              {order.proofSubmittedAt && <p className="text-xs text-muted-foreground">Submitted {formatDateTime(order.proofSubmittedAt)}</p>}
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">The spot</h2>
            <div className="grid gap-4 sm:grid-cols-[240px_minmax(0,1fr)]">
              <ZoneOverlay
                photo={{ url: order.zone.photo.url, label: order.zone.photo.label, width: order.zone.photo.width, height: order.zone.photo.height }}
                zones={[{ id: order.zone.id, number: 1, label: order.zone.label, x: order.zone.x, y: order.zone.y, w: order.zone.w, h: order.zone.h, status: "sold" }]}
                interactive={false}
              />
              <div className="space-y-3 text-sm">
                {order.zone.description && <p className="text-muted-foreground">{order.zone.description}</p>}
                {order.listing.includes && (
                  <div>
                    <p className="mb-1 font-medium">Included</p>
                    <ul className="list-inside list-disc text-muted-foreground">
                      {order.listing.includes
                        .split("\n")
                        .filter(Boolean)
                        .map((i) => (
                          <li key={i}>{i}</li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>

          <AssetsPanel
            orderId={order.id}
            isBuyer={isBuyer}
            editable={!closed && order.status !== "completed"}
            notes={order.brandNotes}
            assets={assets.map((f) => ({ id: f.id, url: f.url, mime: f.mime, note: f.note }))}
          />

          {order.status === "completed" && (
            <ReviewPanel
              orderId={order.id}
              counterpartName={counterpartName}
              myReview={myReview ? { rating: myReview.rating, comment: myReview.comment, published: !!myReview.publishedAt } : null}
              theirReview={theirReview ? { rating: theirReview.rating, comment: theirReview.comment, published: !!theirReview.publishedAt } : null}
            />
          )}

          {/* Quiet exits: a brand can raise a problem before proof exists; a creator can always give the money back. */}
          {(isBuyer && order.status === "paid") || (!isBuyer && ["paid", "proof_submitted", "disputed"].includes(order.status)) ? (
            <div className="border-t pt-4">
              {isBuyer ? (
                <FlagIssueLink orderId={order.id} />
              ) : (
                <RefundForm orderId={order.id} amountCents={order.amountCents} brandName={counterpartName} disputed={order.status === "disputed"} />
              )}
            </div>
          ) : null}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border p-5 text-sm">
            <h3 className="mb-3 font-semibold">Payment</h3>
            <dl className="space-y-2">
              {isBuyer ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{order.status === "pending_payment" ? "You pay" : order.status === "refunded" ? "Refunded" : "You paid"}</dt>
                  <dd className="font-semibold tabular-nums">{formatMoney(order.amountCents)}</dd>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{order.status === "pending_payment" ? "Brand pays" : order.status === "refunded" ? "Refunded to brand" : "Brand paid"}</dt>
                    <dd className="tabular-nums">{formatMoney(order.amountCents)}</dd>
                  </div>
                  {order.status !== "refunded" && order.status !== "cancelled" && (
                    <div className="flex justify-between border-t pt-2">
                      <dt className="font-medium">{order.status === "completed" ? "You earned" : "You earn"}</dt>
                      <dd className="font-semibold tabular-nums">{formatMoney(order.sellerNetCents)}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              {order.status === "pending_payment" && "Awaiting payment."}
              {order.status === "paid" && `Paid ${formatDateTime(order.paidAt)}. Held by Placard until proof is approved.`}
              {order.status === "proof_submitted" && reviewDeadline && `Held by Placard. Releases when ${isBuyer ? "you approve" : "the brand approves"}, or automatically on ${formatDate(reviewDeadline)}.`}
              {order.status === "completed" && `Released ${formatDateTime(order.completedAt)}.`}
              {order.status === "disputed" && "On hold while the issue is open."}
              {order.status === "refunded" && `Refunded ${formatDateTime(order.refundedAt)}.`}
              {order.status === "cancelled" && "No payment was taken."}
            </p>
          </div>

          <div className="rounded-2xl border p-5">
            <p className="mb-3 text-xs font-medium text-muted-foreground uppercase">{isBuyer ? "Creator" : "Brand"}</p>
            <div className="flex items-center gap-3">
              <UserAvatar name={counterpart.name} avatarUrl={counterpart.avatarUrl} />
              <div className="min-w-0">
                <Link href={`/u/${counterpart.handle}`} className="block truncate font-medium hover:underline">
                  {counterpartName}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{counterpart.companyName ? counterpart.name : `@${counterpart.handle}`}</p>
              </div>
            </div>
            <form action={message} className="mt-4">
              <Button type="submit" variant="outline" size="sm" className="w-full">
                <MessageSquare /> Message
              </Button>
            </form>
          </div>

          <ProtectedByPlacard audience={isBuyer ? "brand" : "creator"} />
        </aside>
      </div>
    </div>
  );
}
