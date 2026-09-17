"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Clock, CreditCard, Flag, LifeBuoy, MessageSquare, Star, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileGrid } from "@/components/file-grid";
import { FileUploader, type UploadedFile } from "@/components/file-uploader";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { approveProof, attachOrderFile, disputeOrder, leaveReview, refundOrder, removeOrderFile, saveBrandNotes, startCheckout, submitProof } from "@/lib/actions/orders";
import type { ActionState } from "@/lib/actions/types";
import { PROOF_REVIEW_WINDOW_DAYS, REVIEW_REVEAL_WINDOW_DAYS, SUPPORT_EMAIL } from "@/lib/constants";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type FileView = { id: string; url: string; mime: string; note: string };

function useRunner() {
  const router = useRouter();
  const [state, setState] = useState<ActionState>();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<ActionState>) => {
    setState(undefined);
    startTransition(async () => {
      const result = await fn();
      setState(result);
      if (!result?.error) router.refresh();
    });
  };
  return { state, pending, run, router };
}

export function PayPanel({ orderId, amountCents, provider }: { orderId: string; amountCents: number; provider: "stripe" | "mock" }) {
  const { state, pending, run } = useRunner();
  return (
    <section className="rounded-2xl border border-brand/40 bg-brand-soft/40 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pay {formatMoney(amountCents)} to lock in your spot</h2>
          <p className="text-sm text-muted-foreground">
            {provider === "stripe" ? "You'll be taken to Stripe's secure checkout." : "Test mode: no card needed. Stripe Checkout switches on when a key is configured."} Unpaid spots are released back to the marketplace.
          </p>
        </div>
        <Button size="lg" disabled={pending} onClick={() => run(() => startCheckout(orderId))}>
          <CreditCard /> {pending ? "Redirecting…" : "Pay now"}
        </Button>
      </div>
      <FormMessage state={state} className="mt-3" />
    </section>
  );
}

export function AssetsPanel({ orderId, isBuyer, editable, notes, assets }: { orderId: string; isBuyer: boolean; editable: boolean; notes: string; assets: FileView[] }) {
  const [state, action] = useActionState(saveBrandNotes.bind(null, orderId), undefined);
  const { router } = useRunner();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onUploaded = async (file: UploadedFile) => {
    setUploadError(null);
    try {
      await attachOrderFile(orderId, { url: file.url, mime: file.mime, kind: "asset", note: file.name });
      router.refresh();
    } catch (err) {
      setUploadError((err as Error).message);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Creative and placement notes</h2>
        <p className="text-sm text-muted-foreground">{isBuyer ? "Upload print-ready logos and tell the creator exactly how you want them placed." : "What the brand wants printed and where."}</p>
      </div>
      {isBuyer && editable ? (
        <form action={action} className="space-y-2">
          <Label htmlFor="brandNotes">Placement instructions</Label>
          <Textarea id="brandNotes" name="brandNotes" rows={3} defaultValue={notes} placeholder="Colour, minimum size, clear space, links to tag, anything the creator should know." />
          <div className="flex items-center gap-3">
            <SubmitButton size="sm" variant="outline" pendingText="Saving…">
              Save notes
            </SubmitButton>
            <FormMessage state={state} />
          </div>
        </form>
      ) : (
        <p className="rounded-xl border bg-muted/40 p-4 text-sm whitespace-pre-line">{notes || <span className="text-muted-foreground">No instructions yet.</span>}</p>
      )}
      {assets.length > 0 ? <FileGrid files={assets} /> : <p className="text-sm text-muted-foreground">No logo files uploaded yet.</p>}
      {isBuyer && editable && (
        <div>
          <FileUploader folder="assets" kind="image" multiple variant="button" label="Upload logo files" onUploaded={onUploaded} />
          {uploadError && <p className="mt-2 text-xs text-destructive">{uploadError}</p>}
        </div>
      )}
    </section>
  );
}

/** Creator, order paid (or flagged): collect proof and send it to the brand. */
export function ProofPanel({ orderId, proofs, disputed }: { orderId: string; proofs: FileView[]; disputed?: boolean }) {
  const { state, pending, run, router } = useRunner();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removing, startRemove] = useTransition();

  const onUploaded = async (file: UploadedFile) => {
    setUploadError(null);
    try {
      await attachOrderFile(orderId, { url: file.url, mime: file.mime, kind: "proof", note: file.name });
      router.refresh();
    } catch (err) {
      setUploadError((err as Error).message);
    }
  };

  const onRemove = (fileId: string) => {
    setUploadError(null);
    startRemove(async () => {
      try {
        await removeOrderFile(orderId, fileId);
        router.refresh();
      } catch (err) {
        setUploadError((err as Error).message);
      }
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-brand/40 bg-brand-soft/40 p-5">
      <div>
        <h2 className="text-lg font-semibold">{disputed ? "Add proof and resubmit" : "Upload proof of delivery"}</h2>
        <p className="text-sm text-muted-foreground">
          {disputed
            ? "Address what the brand raised — clearer photos, the missing angle, a video of the logo in place — then resubmit."
            : `Photos or video of the logo in place at the event. The brand has ${PROOF_REVIEW_WINDOW_DAYS} days to approve; if they don't respond, your payout is released automatically.`}
        </p>
      </div>
      {proofs.length > 0 && <FileGrid files={proofs} onRemove={onRemove} removing={removing} />}
      <FileUploader folder="proofs" kind="media" multiple label="Add proof photos or video" hint="Images or MP4/MOV/WEBM up to 25MB each" onUploaded={onUploaded} />
      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
      <div className="flex items-center gap-3">
        <Button disabled={pending || removing || proofs.length === 0} onClick={() => run(() => submitProof(orderId))}>
          <BadgeCheck /> {disputed ? "Resubmit proof" : "Submit proof for approval"}
        </Button>
        <FormMessage state={state} />
      </div>
    </section>
  );
}

/** Creator, proof submitted: nothing to do but wait — and know exactly how long. */
export function ProofSentPanel({ submittedAt, deadline, brandName, payoutCents }: { submittedAt: Date; deadline: Date; brandName: string; payoutCents: number }) {
  return (
    <section className="flex gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
      <Clock className="mt-0.5 size-5 shrink-0 text-emerald-600" />
      <div className="space-y-1 text-sm">
        <h2 className="text-lg font-semibold">Proof sent {formatDate(submittedAt)}. {brandName} is reviewing it.</h2>
        <p>
          They can approve or flag an issue until <span className="font-medium">{formatDate(deadline)}</span>. If we hear nothing by then, your {formatMoney(payoutCents)} is released automatically.
        </p>
        <p className="text-xs opacity-80">You&apos;ll see the status change here and on your dashboard the moment they respond.</p>
      </div>
    </section>
  );
}

/** Brand, proof submitted: photos sit with the approve/flag actions so they don't have to hunt. */
export function ReviewProofPanel({
  orderId,
  deadline,
  creatorName,
  proofs,
  submittedAt,
}: {
  orderId: string;
  deadline: Date;
  creatorName: string;
  proofs: FileView[];
  submittedAt?: Date | null;
}) {
  const { state, pending, run } = useRunner();
  const [flagging, setFlagging] = useState(false);
  return (
    <section className="space-y-4 rounded-2xl border border-brand/40 bg-brand-soft/40 p-5">
      <div>
        <h2 className="text-lg font-semibold">{creatorName} submitted proof</h2>
        <p className="text-sm text-muted-foreground">
          Check the photos below. Approving releases their payout and completes the order. If something&apos;s off, flag it and the payout stays on hold. Please respond by{" "}
          <span className="font-medium text-foreground">{formatDate(deadline)}</span> — after that the payout releases automatically.
        </p>
      </div>
      {proofs.length > 0 && (
        <div className="space-y-2">
          <FileGrid files={proofs} />
          {submittedAt && <p className="text-xs text-muted-foreground">Submitted {formatDateTime(submittedAt)}</p>}
        </div>
      )}
      {flagging ? (
        <DisputeForm orderId={orderId} onCancel={() => setFlagging(false)} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={pending} onClick={() => run(() => approveProof(orderId))}>
            <BadgeCheck /> Approve and release payment
          </Button>
          <Button variant="ghost" className="text-muted-foreground" disabled={pending} onClick={() => setFlagging(true)}>
            <Flag /> Something&apos;s wrong
          </Button>
          <FormMessage state={state} />
        </div>
      )}
    </section>
  );
}

/** Brand: describe what went wrong. Shown inline on proof review, and as a quiet link once an order is paid. */
export function DisputeForm({ orderId, onCancel, placeholder }: { orderId: string; onCancel: () => void; placeholder?: string }) {
  const [state, action] = useActionState(disputeOrder.bind(null, orderId), undefined);
  return (
    <form action={action} className="space-y-2 rounded-xl border border-destructive/30 bg-background p-4">
      <Label htmlFor="reason">What&apos;s the issue?</Label>
      <Textarea id="reason" name="reason" rows={3} required minLength={10} placeholder={placeholder ?? "Logo was on the wrong spot, wasn't worn on day two, photos don't show the event…"} />
      <p className="text-xs text-muted-foreground">The creator sees this and can fix it, resubmit proof, or refund you. Payment stays on hold until it&apos;s resolved.</p>
      <div className="flex items-center gap-2">
        <SubmitButton variant="destructive" size="sm" pendingText="Sending…">
          Flag issue
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/** Brand, order paid but nothing delivered yet: a low-key way to raise a problem before proof exists. */
export function FlagIssueLink({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpen(true)}>
        <Flag /> Creator gone quiet or can&apos;t deliver?
      </Button>
    );
  }
  return <DisputeForm orderId={orderId} onCancel={() => setOpen(false)} placeholder="The event was yesterday and I haven't heard anything, the creator says they can no longer attend…" />;
}

/**
 * An order with an open issue. Both sides see the reason and their own ways out:
 * the creator fixes and resubmits or refunds; the brand accepts the fix or escalates.
 */
export function DisputePanel({
  orderId,
  isBuyer,
  reason,
  flaggedAt,
  counterpartName,
  amountCents,
  messageAction,
}: {
  orderId: string;
  isBuyer: boolean;
  reason: string;
  flaggedAt: Date | null;
  counterpartName: string;
  amountCents: number;
  messageAction: () => Promise<void>;
}) {
  const { state, pending, run } = useRunner();
  const escalate = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Order ${orderId} — help resolving an issue`)}&body=${encodeURIComponent(
    `Order: ${orderId}\nI'm the ${isBuyer ? "brand" : "creator"} on this order and we can't resolve the flagged issue between us.\n\nWhat happened:\n`,
  )}`;

  return (
    <section className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Flag className="size-5" /> {isBuyer ? "You flagged an issue" : `${counterpartName} flagged an issue`}
          {flaggedAt && <span className="text-sm font-normal opacity-70">· {formatDate(flaggedAt)}</span>}
        </h2>
        <blockquote className="rounded-lg border border-red-200/70 bg-background/60 p-3 text-sm whitespace-pre-line dark:border-red-900/60">{reason}</blockquote>
        <p className="text-sm">
          {formatMoney(amountCents)} is on hold. {isBuyer ? `${counterpartName} can fix it and resubmit proof, or refund you in full.` : "Sort it out with them directly — most issues are a missing photo or a misunderstanding."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form action={messageAction}>
          <Button type="submit" variant="outline" size="sm" className="bg-background">
            <MessageSquare /> Message {counterpartName.split(" ")[0]}
          </Button>
        </form>
        {isBuyer && (
          <Button size="sm" disabled={pending} onClick={() => run(() => approveProof(orderId))}>
            <BadgeCheck /> Issue resolved — release payment
          </Button>
        )}
        <Button asChild variant="ghost" size="sm" className="text-red-900/80 dark:text-red-200/80">
          <a href={escalate}>
            <LifeBuoy /> Escalate to Placard
          </a>
        </Button>
        <FormMessage state={state} />
      </div>
      <p className="text-xs opacity-70">
        Can&apos;t agree? Escalating sends the order details to our team, who review the proof, the messages and this thread and make the call. Automatic release is paused while an issue is open.
      </p>
    </section>
  );
}

/** Creator: give the money back. Quiet by default, explicit once opened. */
export function RefundForm({ orderId, amountCents, brandName, disputed }: { orderId: string; amountCents: number; brandName: string; disputed: boolean }) {
  const [state, action] = useActionState(refundOrder.bind(null, orderId), undefined);
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpen(true)}>
        <Undo2 /> {disputed ? "Can't fix it? Refund the brand" : "Can't deliver? Refund the brand"}
      </Button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-xl border p-4">
      <div>
        <p className="font-medium">Refund {formatMoney(amountCents)} to {brandName}</p>
        <p className="text-sm text-muted-foreground">
          The full amount goes back to the brand, the order closes, and the spot goes back on sale if the listing is still open. This can&apos;t be undone.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="refund-note">A note for the brand (optional)</Label>
        <Textarea id="refund-note" name="note" rows={2} placeholder="The organiser cancelled my slot, so I can't deliver this one — sorry." />
      </div>
      <div className="flex items-center gap-2">
        <SubmitButton variant="destructive" size="sm" pendingText="Refunding…">
          Refund {formatMoney(amountCents)}
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Keep the order
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function ReviewPanel({
  orderId,
  counterpartName,
  myReview,
  theirReview,
}: {
  orderId: string;
  counterpartName: string;
  myReview: { rating: number; comment: string; published: boolean } | null;
  theirReview: { rating: number; comment: string; published: boolean } | null;
}) {
  const [state, action] = useActionState(leaveReview.bind(null, orderId), undefined);
  const [rating, setRating] = useState(5);
  const revealed = !!theirReview?.published;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Reviews</h2>
        <p className="text-sm text-muted-foreground">
          Reviews are sealed until both of you have posted, so nobody writes theirs in reaction to the other&apos;s. If only one side reviews, it goes public after {REVIEW_REVEAL_WINDOW_DAYS} days.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Your review of {counterpartName}</p>
          {myReview ? (
            <div className="space-y-2">
              <Review rating={myReview.rating} comment={myReview.comment} />
              {!myReview.published && <p className="text-xs text-muted-foreground">Sealed — {counterpartName} can&apos;t see this until they review you, or {REVIEW_REVEAL_WINDOW_DAYS} days pass.</p>}
            </div>
          ) : (
            <form action={action} className="space-y-3">
              <input type="hidden" name="rating" value={rating} />
              <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(n)} className="rounded p-0.5" aria-label={`${n} star${n === 1 ? "" : "s"}`}>
                    <Star className={cn("size-6", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                  </button>
                ))}
              </div>
              <Textarea name="comment" rows={3} placeholder="How did it go? Be specific — this helps the next brand or creator." />
              <div className="flex items-center gap-3">
                <SubmitButton size="sm" pendingText="Posting…">
                  Post review
                </SubmitButton>
                <FormMessage state={state} />
              </div>
            </form>
          )}
        </div>
        <div className="rounded-2xl border p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">{counterpartName}&apos;s review of you</p>
          {revealed && theirReview ? (
            <Review rating={theirReview.rating} comment={theirReview.comment} />
          ) : theirReview ? (
            <p className="text-sm text-muted-foreground">{counterpartName} has reviewed you. Post yours to reveal both.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Not yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Review({ rating, comment }: { rating: number; comment: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={cn("size-4", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
        ))}
      </div>
      {comment && <p className="text-sm">{comment}</p>}
    </div>
  );
}
