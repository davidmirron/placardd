"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { AUCTIONS_ENABLED, CATEGORY_DESCRIPTIONS, CATEGORY_LABELS } from "@/lib/constants";
import type { ActionState } from "@/lib/actions/types";
import { LISTING_CATEGORIES, type Listing } from "@/lib/db/schema";

function toLocalInput(d: Date | null | undefined) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ListingForm({
  action,
  listing,
  submitLabel,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  listing?: Listing;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  // Auctions need a deadline up front; fixed-price listings can leave it blank and default to the event day.
  const [defaultDeadline] = useState(() => listing?.biddingEndsAt ?? (AUCTIONS_ENABLED ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null));

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required minLength={4} maxLength={120} defaultValue={listing?.title} placeholder="Berlin Marathon — chest logo on my race kit" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={6}
            defaultValue={listing?.description}
            placeholder="Where you'll be, for how long, who will see you, how logos are applied, what else sponsors get."
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Category</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {LISTING_CATEGORIES.map((c) => (
              <label key={c} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 has-checked:border-foreground has-checked:bg-muted/60">
                <input type="radio" name="category" value={c} defaultChecked={(listing?.category ?? "outfit") === c} className="mt-1 accent-foreground" required />
                <span>
                  <span className="block text-sm font-medium">{CATEGORY_LABELS[c]}</span>
                  <span className="block text-xs text-muted-foreground">{CATEGORY_DESCRIPTIONS[c]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Event and timing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="eventName">Event name</Label>
            <Input id="eventName" name="eventName" defaultValue={listing?.eventName ?? ""} placeholder="Berlin Marathon" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eventDate">Event date</Label>
            <Input id="eventDate" name="eventDate" type="date" defaultValue={listing?.eventDate ? toLocalInput(listing.eventDate).slice(0, 10) : ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" required defaultValue={listing?.location} placeholder="Berlin, Germany" />
          </div>
          {AUCTIONS_ENABLED ? (
            <div className="space-y-1.5">
              <Label htmlFor="biddingEndsAt">Bidding closes</Label>
              <Input id="biddingEndsAt" name="biddingEndsAt" type="datetime-local" required defaultValue={toLocalInput(defaultDeadline)} />
              <p className="text-xs text-muted-foreground">Leave enough time after this to print or apply the logos.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="biddingEndsAt">
                Available until <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input id="biddingEndsAt" name="biddingEndsAt" type="datetime-local" defaultValue={toLocalInput(defaultDeadline)} />
              <p className="text-xs text-muted-foreground">Spots stop being purchasable at this time. Leave blank to sell until the end of the event day.</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Reach</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="reachInPerson">People who will see you in person</Label>
            <Input id="reachInPerson" name="reachInPerson" type="number" min={0} defaultValue={listing?.reachInPerson ?? ""} placeholder="8000" />
            <p className="text-xs text-muted-foreground">Event attendance, spectators, foot traffic.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reachSocial">Social reach</Label>
            <Input id="reachSocial" name="reachSocial" type="number" min={0} defaultValue={listing?.reachSocial ?? ""} placeholder="25000" />
            <p className="text-xs text-muted-foreground">Followers who will see the posts you promise.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">What every sponsor gets</h2>
        <div className="space-y-1.5">
          <Label htmlFor="includes">One item per line</Label>
          <Textarea
            id="includes"
            name="includes"
            rows={4}
            defaultValue={listing?.includes}
            placeholder={"Sublimated logo on race kit (up to 12cm)\nFeatured in my race film\nKit photos for your channels"}
          />
        </div>
      </section>

      <FormMessage state={state} />
      <SubmitButton size="lg" pendingText="Saving…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
