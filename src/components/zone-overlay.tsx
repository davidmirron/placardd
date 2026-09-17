"use client";

import { cn } from "@/lib/utils";

export type OverlayZone = {
  id: string;
  label: string;
  number: number;
  x: number;
  y: number;
  w: number;
  h: number;
  status?: "open" | "sold" | "unsold" | "cancelled";
};

export function ZoneOverlay({
  photo,
  zones,
  selectedId,
  selectedIds,
  onSelect,
  className,
  interactive = true,
}: {
  photo: { url: string; label: string; width: number; height: number };
  zones: OverlayZone[];
  selectedId?: string | null;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  className?: string;
  interactive?: boolean;
}) {
  const ratio = photo.width && photo.height ? `${photo.width} / ${photo.height}` : "4 / 5";
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-muted", className)} style={{ aspectRatio: ratio }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={photo.label} className="absolute inset-0 size-full object-cover" draggable={false} />
      {zones.map((z) => {
        const selected = z.id === selectedId || !!selectedIds?.includes(z.id);
        const sold = z.status === "sold";
        const gone = z.status === "unsold" || z.status === "cancelled";
        return (
          <button
            key={z.id}
            type="button"
            disabled={!interactive}
            onClick={() => onSelect?.(z.id)}
            aria-label={`Spot ${z.number}: ${z.label}`}
            className={cn(
              "zone-box group",
              selected ? "border-brand bg-brand/25" : sold ? "border-emerald-400 bg-emerald-400/15" : gone ? "border-white/40 bg-black/20" : "border-white/90 bg-white/10 hover:bg-white/25",
              interactive && "cursor-pointer",
            )}
            style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%`, width: `${z.w * 100}%`, height: `${z.h * 100}%` }}
          >
            <span className={cn("zone-badge", selected ? "bg-brand text-brand-foreground" : sold ? "bg-emerald-500 text-white" : "bg-foreground text-background")}>
              {z.number}
            </span>
            <span className="pointer-events-none absolute bottom-1 left-1 hidden max-w-[calc(100%-0.5rem)] truncate rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white group-hover:block">
              {z.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
