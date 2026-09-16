"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormMessage } from "@/components/form-bits";
import { AUCTIONS_ENABLED, BID_RULE_DESCRIPTIONS, BID_RULE_LABELS, SALE_TYPE_LABELS } from "@/lib/constants";
import type { ActionState } from "@/lib/actions/types";
import type { ZoneInput } from "@/lib/actions/listings";
import type { BidRule, SaleType } from "@/lib/db/schema";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type EditorPhoto = { id: string; url: string; label: string; width: number; height: number };
export type EditorZone = ZoneInput & { key: string; locked: boolean };

type Drag =
  | { kind: "draw"; startX: number; startY: number; key: string }
  | { kind: "move"; key: string; offsetX: number; offsetY: number }
  | { kind: "resize"; key: string };

const MIN_SIZE = 0.03;
const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

export function ZoneEditor({
  photos,
  initialZones,
  onSave,
  feePercent,
}: {
  photos: EditorPhoto[];
  initialZones: EditorZone[];
  onSave: (zones: ZoneInput[]) => Promise<ActionState>;
  /** Placard's cut, passed from the server so the "you'll earn" preview matches what the order will record. */
  feePercent: number;
}) {
  // Mirrors splitAmount() in lib/money.ts, in cents.
  const earningsCents = (priceDollars: number) => {
    const cents = Math.round(priceDollars * 100);
    return cents - Math.round((cents * feePercent) / 100);
  };
  const router = useRouter();
  const [zones, setZones] = useState<EditorZone[]>(initialZones);
  const [photoId, setPhotoId] = useState(photos[0]?.id ?? "");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState<ActionState>();
  const [pending, startTransition] = useTransition();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const keyCounter = useRef(0);

  const photo = photos.find((p) => p.id === photoId) ?? photos[0];
  const zonesOnPhoto = useMemo(() => zones.filter((z) => z.photoId === photo?.id), [zones, photo?.id]);
  const selected = zones.find((z) => z.key === selectedKey) ?? null;

  const update = useCallback((key: string, patch: Partial<EditorZone>) => {
    setZones((prev) => prev.map((z) => (z.key === key ? { ...z, ...patch } : z)));
    setDirty(true);
  }, []);

  const toLocal = (e: React.PointerEvent) => {
    const rect = surfaceRef.current!.getBoundingClientRect();
    return { x: clamp((e.clientX - rect.left) / rect.width), y: clamp((e.clientY - rect.top) / rect.height) };
  };

  const onSurfaceDown = (e: React.PointerEvent) => {
    if (!photo || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-zone]")) return;
    const { x, y } = toLocal(e);
    const key = `new_${++keyCounter.current}`;
    const zone: EditorZone = {
      key,
      photoId: photo.id,
      label: `Spot ${zones.length + 1}`,
      description: "",
      x,
      y,
      w: MIN_SIZE,
      h: MIN_SIZE,
      saleType: AUCTIONS_ENABLED ? "auction" : "buy_now",
      bidRule: "increment",
      startingPrice: 100,
      minIncrement: 25,
      buyNowPrice: null,
      locked: false,
    };
    setZones((prev) => [...prev, zone]);
    setSelectedKey(key);
    setDrag({ kind: "draw", startX: x, startY: y, key });
    surfaceRef.current?.setPointerCapture(e.pointerId);
  };

  const onZoneDown = (e: React.PointerEvent, z: EditorZone) => {
    e.stopPropagation();
    setSelectedKey(z.key);
    if (z.locked) return;
    const { x, y } = toLocal(e);
    setDrag({ kind: "move", key: z.key, offsetX: x - z.x, offsetY: y - z.y });
    surfaceRef.current?.setPointerCapture(e.pointerId);
  };

  const onHandleDown = (e: React.PointerEvent, z: EditorZone) => {
    e.stopPropagation();
    if (z.locked) return;
    setSelectedKey(z.key);
    setDrag({ kind: "resize", key: z.key });
    surfaceRef.current?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const { x, y } = toLocal(e);
    if (drag.kind === "draw") {
      const left = Math.min(drag.startX, x);
      const top = Math.min(drag.startY, y);
      update(drag.key, { x: left, y: top, w: Math.max(MIN_SIZE, Math.abs(x - drag.startX)), h: Math.max(MIN_SIZE, Math.abs(y - drag.startY)) });
    } else if (drag.kind === "move") {
      const z = zones.find((v) => v.key === drag.key);
      if (!z) return;
      update(drag.key, { x: clamp(x - drag.offsetX, 0, 1 - z.w), y: clamp(y - drag.offsetY, 0, 1 - z.h) });
    } else {
      const z = zones.find((v) => v.key === drag.key);
      if (!z) return;
      update(drag.key, { w: clamp(x - z.x, MIN_SIZE, 1 - z.x), h: clamp(y - z.y, MIN_SIZE, 1 - z.y) });
    }
  };

  const onUp = () => setDrag(null);

  const remove = (key: string) => {
    setZones((prev) => prev.filter((z) => z.key !== key));
    if (selectedKey === key) setSelectedKey(null);
    setDirty(true);
  };

  const save = () => {
    setState(undefined);
    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const payload: ZoneInput[] = zones.map(({ key, locked, ...z }) => ({
        ...z,
        id: key.startsWith("new_") ? undefined : key,
        startingPrice: Number(z.startingPrice) || 0,
        minIncrement: Number(z.minIncrement) || 0,
        buyNowPrice: z.buyNowPrice ? Number(z.buyNowPrice) : null,
      }));
      const result = await onSave(payload);
      setState(result);
      if (!result?.error) {
        setDirty(false);
        router.refresh();
      }
    });
  };

  if (!photo) {
    return <p className="text-sm text-muted-foreground">Upload a photo first, then come back to draw your ad spots.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">
        {photos.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {photos.map((p) => {
              const count = zones.filter((z) => z.photoId === p.id).length;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPhotoId(p.id);
                    setSelectedKey(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm",
                    p.id === photo.id ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="size-7 rounded object-cover" />
                  {p.label}
                  {count > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] text-brand-foreground">{count}</span>}
                </button>
              );
            })}
          </div>
        )}

        <div
          ref={surfaceRef}
          onPointerDown={onSurfaceDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="relative touch-none overflow-hidden rounded-xl bg-muted select-none"
          style={{ aspectRatio: `${photo.width || 4} / ${photo.height || 5}`, cursor: drag ? "grabbing" : "crosshair" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={photo.label} className="pointer-events-none absolute inset-0 size-full object-cover" draggable={false} />
          {zonesOnPhoto.map((z) => {
            const number = zones.indexOf(z) + 1;
            const isSelected = z.key === selectedKey;
            return (
              <div
                key={z.key}
                data-zone
                onPointerDown={(e) => onZoneDown(e, z)}
                className={cn(
                  "zone-box",
                  isSelected ? "border-brand bg-brand/25" : z.locked ? "border-emerald-400 bg-emerald-400/15" : "border-white/90 bg-white/15 hover:bg-white/25",
                  z.locked ? "cursor-not-allowed" : "cursor-move",
                )}
                style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%`, width: `${z.w * 100}%`, height: `${z.h * 100}%` }}
              >
                <span className={cn("zone-badge", isSelected ? "bg-brand text-brand-foreground" : "bg-foreground text-background")}>
                  {z.locked ? <Lock className="size-3" /> : number}
                </span>
                {!z.locked && (
                  <span
                    onPointerDown={(e) => onHandleDown(e, z)}
                    className="absolute -right-1.5 -bottom-1.5 size-3.5 cursor-nwse-resize rounded-sm border border-white bg-foreground"
                  />
                )}
              </div>
            );
          })}
          {zonesOnPhoto.length === 0 && !drag && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
              <span className="rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white">Click and drag on the photo to draw an ad spot</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Drag on the photo to draw a spot. Drag a spot to move it, use the corner handle to resize. {AUCTIONS_ENABLED ? "Spots with bids are locked." : "Sold spots are locked."}
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">Spots ({zones.length})</h3>
            <Button type="button" size="sm" variant="outline" onClick={() => setSelectedKey(null)} disabled={!selectedKey}>
              <Plus /> New
            </Button>
          </div>
          {zones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No spots yet. Draw your first one on the photo.</p>
          ) : (
            <ul className="space-y-1">
              {zones.map((z, i) => (
                <li key={z.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoId(z.photoId);
                      setSelectedKey(z.key);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                      z.key === selectedKey && "bg-muted",
                    )}
                  >
                    <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">{i + 1}</span>
                    <span className="flex-1 truncate">{z.label || "Untitled spot"}</span>
                    <span className="text-xs text-muted-foreground">
                      {AUCTIONS_ENABLED && (z.saleType === "buy_now" ? "Buy " : "Bid ")}${Number(z.startingPrice) || 0}
                    </span>
                    {z.locked && <Lock className="size-3 text-muted-foreground" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected ? (
          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Spot details</h3>
              {!selected.locked && (
                <Button type="button" size="icon-sm" variant="ghost" onClick={() => remove(selected.key)} aria-label="Delete spot">
                  <Trash2 />
                </Button>
              )}
            </div>
            {selected.locked && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                {AUCTIONS_ENABLED ? "This spot already has bids or an order." : "This spot has been sold."} You can update its name and description only.
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="zone-label">Name</Label>
              <Input id="zone-label" value={selected.label} onChange={(e) => update(selected.key, { label: e.target.value })} placeholder="Front chest" maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zone-desc">Description</Label>
              <Textarea
                id="zone-desc"
                rows={2}
                value={selected.description}
                onChange={(e) => update(selected.key, { description: e.target.value })}
                placeholder="Size in cm, print method, what it's visible in"
                maxLength={500}
              />
            </div>
            <div className={cn("grid gap-3", AUCTIONS_ENABLED && "grid-cols-2")}>
              {AUCTIONS_ENABLED && (
                <div className="space-y-1.5">
                  <Label>Sale type</Label>
                  <Select value={selected.saleType} onValueChange={(v) => update(selected.key, { saleType: v as SaleType })} disabled={selected.locked}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SALE_TYPE_LABELS) as SaleType[]).map((k) => (
                        <SelectItem key={k} value={k}>{SALE_TYPE_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="zone-start">{!AUCTIONS_ENABLED || selected.saleType === "buy_now" ? "Price (USD)" : "Starting bid (USD)"}</Label>
                <Input
                  id="zone-start"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="decimal"
                  value={selected.startingPrice}
                  onChange={(e) => update(selected.key, { startingPrice: e.target.valueAsNumber || 0 })}
                  disabled={selected.locked}
                />
                {!AUCTIONS_ENABLED && (
                  <p className="text-xs text-muted-foreground">
                    Brands pay <span className="font-medium text-foreground">{formatMoney(Math.round((Number(selected.startingPrice) || 0) * 100))}</span> at checkout · you earn{" "}
                    <span className="font-medium text-foreground">{formatMoney(earningsCents(Number(selected.startingPrice) || 0))}</span> once proof is approved.
                  </p>
                )}
              </div>
            </div>
            {AUCTIONS_ENABLED && selected.saleType === "auction" && (
              <>
                <div className="space-y-1.5">
                  <Label>Bid rule</Label>
                  <Select value={selected.bidRule} onValueChange={(v) => update(selected.key, { bidRule: v as BidRule })} disabled={selected.locked}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(BID_RULE_LABELS) as BidRule[]).map((k) => (
                        <SelectItem key={k} value={k}>{BID_RULE_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{BID_RULE_DESCRIPTIONS[selected.bidRule]}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {selected.bidRule === "increment" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="zone-inc">Min. increment (USD)</Label>
                      <Input
                        id="zone-inc"
                        type="number"
                        min={1}
                        step={1}
                        value={selected.minIncrement}
                        onChange={(e) => update(selected.key, { minIncrement: e.target.valueAsNumber || 0 })}
                        disabled={selected.locked}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="zone-bn">Buy now (optional)</Label>
                    <Input
                      id="zone-bn"
                      type="number"
                      min={1}
                      step={1}
                      placeholder="—"
                      value={selected.buyNowPrice ?? ""}
                      onChange={(e) => update(selected.key, { buyNowPrice: e.target.value ? e.target.valueAsNumber : null })}
                      disabled={selected.locked}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Select a spot to edit its name{AUCTIONS_ENABLED ? ", pricing and auction rule" : ", description and price"} — or draw a new one on the photo.
          </div>
        )}

        <div className="space-y-2">
          <Button type="button" onClick={save} disabled={pending || (!dirty && zones.length === initialZones.length)} className="w-full">
            {pending ? "Saving…" : dirty ? "Save spots" : "Spots saved"}
          </Button>
          <FormMessage state={state} />
        </div>
      </div>
    </div>
  );
}
