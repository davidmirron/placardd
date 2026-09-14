"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadedFile = { url: string; mime: string; size: number; width: number; height: number; name: string };

async function imageSize(file: File): Promise<{ width: number; height: number }> {
  if (!file.type.startsWith("image/")) return { width: 0, height: 0 };
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export function FileUploader({
  folder,
  kind = "image",
  accept,
  multiple = false,
  label = "Upload",
  hint,
  disabled,
  onUploaded,
  className,
  variant = "dropzone",
}: {
  folder: "listings" | "proofs" | "assets" | "avatars";
  kind?: "image" | "media";
  accept?: string;
  multiple?: boolean;
  label?: string;
  hint?: string;
  disabled?: boolean;
  onUploaded: (file: UploadedFile) => Promise<void> | void;
  className?: string;
  variant?: "dropzone" | "button";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("file", file);
        form.set("folder", folder);
        form.set("kind", kind);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = (await res.json()) as { url?: string; mime?: string; size?: number; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed.");
        const dims = await imageSize(file);
        await onUploaded({ url: data.url, mime: data.mime ?? file.type, size: data.size ?? file.size, ...dims, name: file.name });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const acceptValue = accept ?? (kind === "image" ? "image/*" : "image/*,video/mp4,video/quicktime,video/webm");

  if (variant === "button") {
    return (
      <div className={className}>
        <input ref={inputRef} type="file" accept={acceptValue} multiple={multiple} className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} disabled={disabled || busy} />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Upload />}
          {busy ? "Uploading…" : label}
        </Button>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <input ref={inputRef} type="file" accept={acceptValue} multiple={multiple} className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} disabled={disabled || busy} />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center text-sm transition-colors",
          dragOver ? "border-brand bg-brand-soft" : "hover:bg-muted/60",
          (disabled || busy) && "opacity-60",
        )}
      >
        {busy ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : <Upload className="size-5 text-muted-foreground" />}
        <span className="font-medium">{busy ? "Uploading…" : label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
