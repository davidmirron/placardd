"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/form-bits";
import { cancelListing, deleteDraft, publishListing, unpublishListing } from "@/lib/actions/listings";
import type { ActionState } from "@/lib/actions/types";
import type { ListingStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function PublishPanel({
  listingId,
  status,
  photoCount,
  zoneCount,
  hasBids,
}: {
  listingId: string;
  status: ListingStatus;
  photoCount: number;
  zoneCount: number;
  hasBids: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>();
  const [pending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const run = (fn: () => Promise<ActionState>) => {
    setState(undefined);
    startTransition(async () => {
      const result = await fn();
      setState(result);
      if (!result?.error) router.refresh();
    });
  };

  const checks = [
    { ok: true, label: "Details filled in" },
    { ok: photoCount > 0, label: photoCount > 0 ? `${photoCount} photo${photoCount === 1 ? "" : "s"} added` : "Add at least one photo" },
    { ok: zoneCount > 0, label: zoneCount > 0 ? `${zoneCount} ad spot${zoneCount === 1 ? "" : "s"} priced` : "Draw at least one ad spot" },
  ];
  const ready = checks.every((c) => c.ok);

  return (
    <div className="space-y-4 rounded-2xl border p-5">
      <h2 className="font-semibold">{status === "draft" ? "Ready to publish?" : "Listing controls"}</h2>
      <ul className="space-y-2 text-sm">
        {checks.map((c) => (
          <li key={c.label} className={cn("flex items-center gap-2", c.ok ? "text-foreground" : "text-muted-foreground")}>
            {c.ok ? <Check className="size-4 text-emerald-600" /> : <Circle className="size-4" />}
            {c.label}
          </li>
        ))}
      </ul>

      {status === "draft" && (
        <div className="space-y-2">
          <Button className="w-full" disabled={!ready || pending} onClick={() => run(() => publishListing(listingId))}>
            <Rocket /> Publish listing
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground" disabled={pending} onClick={() => run(() => deleteDraft(listingId))}>
            Delete draft
          </Button>
        </div>
      )}

      {status === "active" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Your listing is live. Edits to details save immediately; spots with bids are locked.</p>
          {!hasBids && (
            <Button variant="outline" className="w-full" disabled={pending} onClick={() => run(() => unpublishListing(listingId))}>
              Move back to draft
            </Button>
          )}
          {confirmCancel ? (
            <div className="space-y-2 rounded-lg border border-destructive/40 p-3">
              <p className="text-xs">Cancelling closes every open spot and voids current bids. Existing paid orders are kept.</p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" disabled={pending} onClick={() => run(() => cancelListing(listingId))}>
                  Yes, cancel listing
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>
                  Keep it
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={() => setConfirmCancel(true)}>
              Cancel listing
            </Button>
          )}
        </div>
      )}

      {(status === "ended" || status === "cancelled") && <p className="text-xs text-muted-foreground">This listing is closed. You can still update its description for the record.</p>}

      <FormMessage state={state} />
    </div>
  );
}
