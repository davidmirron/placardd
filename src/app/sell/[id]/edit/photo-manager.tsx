"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUploader, type UploadedFile } from "@/components/file-uploader";
import { addPhoto, removePhoto } from "@/lib/actions/listings";
import { PHOTO_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Photo = { id: string; url: string; label: string; width: number; height: number };

export function PhotoManager({ listingId, photos }: { listingId: string; photos: Photo[] }) {
  const router = useRouter();
  const [label, setLabel] = useState<string>(PHOTO_LABELS[Math.min(photos.length, PHOTO_LABELS.length - 1)]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onUploaded = async (file: UploadedFile) => {
    setError(null);
    try {
      await addPhoto(listingId, { url: file.url, label, width: file.width, height: file.height });
      const next = PHOTO_LABELS[Math.min(photos.length + 1, PHOTO_LABELS.length - 1)];
      setLabel(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const remove = (photoId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await removePhoto(listingId, photoId);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Photos</h2>
        <p className="text-sm text-muted-foreground">
          Add clear, well-lit photos of exactly what will be seen — front, back, sides and close-ups. You&apos;ll draw the ad spots on these next. Up to 8 photos.
        </p>
      </div>

      {photos.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => (
            <li key={p.id} className="group relative overflow-hidden rounded-xl border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.label} className="aspect-[4/5] w-full object-cover" />
              <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">{p.label}</span>
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                className="absolute top-2 right-2 opacity-90"
                onClick={() => remove(p.id)}
                disabled={pending}
                aria-label={`Remove ${p.label} photo`}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {photos.length < 8 && (
        <div className="space-y-3 rounded-2xl border p-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Label for the next photo</p>
            <div className="flex flex-wrap gap-1.5">
              {PHOTO_LABELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLabel(l)}
                  className={cn("rounded-full border px-3 py-1 text-xs", label === l ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <FileUploader folder="listings" kind="image" multiple label={`Upload ${label.toLowerCase()} photo`} hint="JPG, PNG or WEBP up to 25MB. Drag and drop works too." onUploaded={onUploaded} />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
