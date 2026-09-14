"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CreditCard, Flag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileGrid } from "@/components/file-grid";
import { FileUploader, type UploadedFile } from "@/components/file-uploader";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { approveProof, attachOrderFile, disputeOrder, leaveReview, saveBrandNotes, startCheckout, submitProof } from "@/lib/actions/orders";
import type { ActionState } from "@/lib/actions/types";
import { formatMoney } from "@/lib/format";
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

export function ProofPanel({ orderId, proofs }: { orderId: string; proofs: FileView[] }) {
  const { state, pending, run, router } = useRunner();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onUploaded = async (file: UploadedFile) => {
    setUploadError(null);
    try {
      await attachOrderFile(orderId, { url: file.url, mime: file.mime, kind: "proof", note: file.name });
      router.refresh();
    } catch (err) {
      setUploadError((err as Error).message);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-brand/40 bg-brand-soft/40 p-5">
      <div>
        <h2 className="text-lg font-semibold">Upload proof of delivery</h2>
        <p className="text-sm text-muted-foreground">Photos or video of the logo in place at the event. The brand approves these to release your payout.</p>
      </div>
      {proofs.length > 0 && <FileGrid files={proofs} />}
      <FileUploader folder="proofs" kind="media" multiple label="Add proof photos or video" hint="Images or MP4/MOV/WEBM up to 25MB each" onUploaded={onUploaded} />
      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
      <div className="flex items-center gap-3">
        <Button disabled={pending || proofs.length === 0} onClick={() => run(() => submitProof(orderId))}>
          <BadgeCheck /> Submit proof for approval
        </Button>
        <FormMessage state={state} />
      </div>
    </section>
  );
}

export function ReviewProofPanel({ orderId }: { orderId: string }) {
  const { state, pending, run } = useRunner();
  return (
    <section className="space-y-3 rounded-2xl border border-brand/40 bg-brand-soft/40 p-5">
      <h2 className="text-lg font-semibold">The creator submitted proof</h2>
      <p className="text-sm text-muted-foreground">Check the photos below. Approving releases the payout to the creator and completes the order.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} onClick={() => run(() => approveProof(orderId))}>
          <BadgeCheck /> Approve and release payment
        </Button>
        <FormMessage state={state} />
      </div>
    </section>
  );
}

export function DisputeForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(disputeOrder.bind(null, orderId), undefined);
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpen(true)}>
        <Flag /> Something wrong with the proof?
      </Button>
    );
  }
  return (
    <form action={action} className="space-y-2 rounded-xl border border-destructive/30 p-4">
      <Label htmlFor="reason">Describe the issue</Label>
      <Textarea id="reason" name="reason" rows={3} required placeholder="Logo was on the wrong spot, wasn't worn on day two, photos don't show the event…" />
      <div className="flex items-center gap-2">
        <SubmitButton variant="destructive" size="sm" pendingText="Sending…">
          Flag issue
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
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
  myReview: { rating: number; comment: string } | null;
  theirReview: { rating: number; comment: string } | null;
}) {
  const [state, action] = useActionState(leaveReview.bind(null, orderId), undefined);
  const [rating, setRating] = useState(5);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Reviews</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Your review of {counterpartName}</p>
          {myReview ? (
            <Review rating={myReview.rating} comment={myReview.comment} />
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
          {theirReview ? <Review rating={theirReview.rating} comment={theirReview.comment} /> : <p className="text-sm text-muted-foreground">Not yet.</p>}
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
