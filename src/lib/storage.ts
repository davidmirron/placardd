import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

/**
 * Local-disk storage. Files live under ./data/uploads and are served by /api/files/[...path].
 * Swap this module for S3 / R2 / UploadThing when moving off a single box.
 */

export const UPLOAD_ROOT = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./data/uploads");

export const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
export const VIDEO_MIMES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export type UploadKind = "image" | "media";

export class UploadError extends Error {}

export async function saveUpload(file: File, folder: string, kind: UploadKind = "image") {
  const allowed = kind === "image" ? IMAGE_MIMES : new Set([...IMAGE_MIMES, ...VIDEO_MIMES]);
  if (!allowed.has(file.type)) {
    throw new UploadError(
      kind === "image" ? "Only JPG, PNG, WEBP, GIF or SVG images are allowed." : "Only images and MP4/MOV/WEBM videos are allowed.",
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(`Files must be under ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.`);
  }
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
  const name = `${nanoid(16)}.${EXT_BY_MIME[file.type] ?? "bin"}`;
  const dir = path.join(/*turbopackIgnore: true*/ UPLOAD_ROOT, safeFolder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ dir, name), Buffer.from(await file.arrayBuffer()));
  return { url: `/api/files/${safeFolder}/${name}`, mime: file.type, size: file.size };
}

export function resolveUploadPath(segments: string[]) {
  const target = path.resolve(/*turbopackIgnore: true*/ UPLOAD_ROOT, ...segments);
  if (!target.startsWith(UPLOAD_ROOT + path.sep)) return null;
  return target;
}

export function mimeForPath(p: string) {
  const ext = path.extname(p).slice(1).toLowerCase();
  const entry = Object.entries(EXT_BY_MIME).find(([, e]) => e === ext);
  return entry?.[0] ?? "application/octet-stream";
}
