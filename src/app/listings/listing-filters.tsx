"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS } from "@/lib/constants";
import { EVENT_TYPES, LISTING_CATEGORIES } from "@/lib/db/schema";
import type { ListingFilters as Filters } from "@/lib/queries";
import { cn } from "@/lib/utils";

const SORTS = [
  ["ending", "Ending soon"],
  ["newest", "Newest"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
  ["reach", "Biggest reach"],
] as const;

const REACH_PRESETS = [
  [0, "Any"],
  [10000, "10K+"],
  [50000, "50K+"],
  [250000, "250K+"],
] as const;

export function ListingFilters({ filters }: { filters: Filters }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const [k, v] of data.entries()) {
      if (typeof v === "string" && v.trim() && v !== "0" && !(k === "sort" && v === "ending")) params.set(k, v.trim());
    }
    router.push(`/listings${params.size ? `?${params}` : ""}`);
  };

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" className="w-full lg:hidden" onClick={() => setOpen((v) => !v)}>
        <SlidersHorizontal /> {open ? "Hide filters" : "Filters"}
      </Button>
      <form
        key={JSON.stringify(filters)}
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
        onChange={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === "SELECT" || (target as HTMLInputElement).type === "radio") submit(e.currentTarget);
        }}
        className={cn("space-y-5 rounded-2xl border p-4", open ? "block" : "hidden lg:block")}
      >
        <div className="space-y-1.5">
          <Label htmlFor="q">Search</Label>
          <Input id="q" name="q" defaultValue={filters.q ?? ""} placeholder="Event, city, keyword" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sort">Sort by</Label>
          <select id="sort" name="sort" defaultValue={filters.sort ?? "ending"} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
            {SORTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Event type</legend>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="eventType" value="" defaultChecked={!filters.eventType} className="accent-foreground" /> All
            </label>
            {EVENT_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input type="radio" name="eventType" value={t} defaultChecked={filters.eventType === t} className="accent-foreground" /> {EVENT_TYPE_LABELS[t]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Ad surface</legend>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="category" value="" defaultChecked={!filters.category} className="accent-foreground" /> All
            </label>
            {LISTING_CATEGORIES.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input type="radio" name="category" value={c} defaultChecked={filters.category === c} className="accent-foreground" /> {CATEGORY_LABELS[c]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={filters.location ?? ""} placeholder="Berlin, Lisbon…" />
        </div>

        <div className="space-y-1.5">
          <Label>Starting price (USD)</Label>
          <div className="flex items-center gap-2">
            <Input name="minPrice" type="number" min={0} defaultValue={filters.minPrice ?? ""} placeholder="Min" aria-label="Minimum price" />
            <span className="text-muted-foreground">–</span>
            <Input name="maxPrice" type="number" min={0} defaultValue={filters.maxPrice ?? ""} placeholder="Max" aria-label="Maximum price" />
          </div>
        </div>

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Minimum reach</legend>
          <div className="flex flex-wrap gap-1.5">
            {REACH_PRESETS.map(([v, l]) => (
              <label
                key={v}
                className={cn(
                  "cursor-pointer rounded-full border px-2.5 py-1 text-xs has-checked:border-foreground has-checked:bg-foreground has-checked:text-background",
                )}
              >
                <input type="radio" name="minReach" value={v} defaultChecked={(filters.minReach ?? 0) === v} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Apply
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/listings")}>
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
}
