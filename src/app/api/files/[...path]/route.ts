import fs from "node:fs";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { mimeForPath, resolveUploadPath } from "@/lib/storage";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params;
  const target = resolveUploadPath(segments);
  if (!target) return new NextResponse("Not found", { status: 404 });

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(target);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!stat.isFile()) return new NextResponse("Not found", { status: 404 });

  const stream = Readable.toWeb(fs.createReadStream(target)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": mimeForPath(target),
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
