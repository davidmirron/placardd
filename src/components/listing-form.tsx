"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { AUCTIONS_ENABLED, CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, EVENT_TYPE_DESCRIPTIONS, EVENT_TYPE_LABELS } from "@/lib/constants";
import type { ActionState } from "@/lib/actions/types";
import { EVENT_TYPES, LISTING_CATEGORIES, type Listing } from "@/lib/db/schema";

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
          <legend className="text-sm font-medium">What the logo is on</legend>
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
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">What kind of event</legend>
          <p className="text-xs text-muted-foreground">Sports, a race, a conference, a convention — not the same as what the logo sits on.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {EVENT_TYPES.map((t) => (
              <label key={t} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 has-checked:border-foreground has-checked:bg-muted/60">
                <input type="radio" name="eventType" value={t} defaultChecked={listing?.eventType === t} className="mt-1 accent-foreground" required />
                <span>
                  <span className="block text-sm font-medium">{EVENT_TYPE_LABELS[t]}</span>
                  <span className="block text-xs text-muted-foreground">{EVENT_TYPE_DESCRIPTIONS[t]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
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
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Audience & exposure</h2>
          <p className="text-sm text-muted-foreground">
            Event size is context. Brands care about how many people will actually see the logo on you — a 200,000-person conference or a million marathon spectators is not the same as 20,000 face-to-face impressions.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="eventAttendance">
              Event attendance <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="eventAttendance" name="eventAttendance" inputMode="numeric" defaultValue={listing?.eventAttendance || ""} placeholder="200000" />
            <p className="text-xs text-muted-foreground">Total people at the event — visitors, runners, spectators.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reachInPerson">People who will see you</Label>
            <Input id="reachInPerson" name="reachInPerson" inputMode="numeric" defaultValue={listing?.reachInPerson || ""} placeholder="20000" />
            <p className="text-xs text-muted-foreground">Your honest estimate of face-to-face impressions. If you have a range, enter the lower number.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reachSocial">Social reach</Label>
            <Input id="reachSocial" name="reachSocial" inputMode="numeric" defaultValue={listing?.reachSocial || ""} placeholder="25000" />
            <p className="text-xs text-muted-foreground">Followers who will see the posts you promise.</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audienceProfile">
            Who they are <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="audienceProfile"
            name="audienceProfile"
            maxLength={500}
            rows={3}
            defaultValue={listing?.audienceProfile ?? ""}
            placeholder="1,900+ VCs, 1,800+ global tech brands, and C-suite visitors over 4 days."
          />
          <p className="text-xs text-muted-foreground">A short profile of the room — not a second headcount.</p>
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
