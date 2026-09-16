"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FileGrid({
  files,
  onRemove,
  removing,
}: {
  files: { id: string; url: string; mime: string; note: string }[];
  onRemove?: (id: string) => void;
  removing?: boolean;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {files.map((f) => (
        <li key={f.id} className="relative overflow-hidden rounded-xl border bg-muted">
          {f.mime.startsWith("video/") ? (
            <video src={f.url} controls className="aspect-square w-full object-cover" />
          ) : (
            <a href={f.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.note || "Uploaded file"} className="aspect-square w-full object-cover" />
            </a>
          )}
          {f.note && <p className="px-2 py-1.5 text-xs text-muted-foreground">{f.note}</p>}
          {onRemove && (
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="absolute top-2 right-2 z-10 opacity-90"
              onClick={() => onRemove(f.id)}
              disabled={removing}
              aria-label={`Remove ${f.note || "file"}`}
            >
              <Trash2 />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
