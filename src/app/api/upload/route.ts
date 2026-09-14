import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { saveUpload, UploadError, type UploadKind } from "@/lib/storage";

const FOLDERS = new Set(["listings", "proofs", "assets", "avatars"]);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You need to be signed in to upload." }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "");
  const kind = (String(form.get("kind") ?? "image") as UploadKind) === "media" ? "media" : "image";

  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (!FOLDERS.has(folder)) return NextResponse.json({ error: "Unknown upload target." }, { status: 400 });

  try {
    const saved = await saveUpload(file, folder, kind);
    return NextResponse.json(saved);
  } catch (err) {
    if (err instanceof UploadError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
