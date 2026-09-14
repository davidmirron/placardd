import { NextResponse, type NextRequest } from "next/server";
import { settleExpired } from "@/lib/auctions";

/**
 * Settles ended auctions and expires unpaid orders. Settlement also runs lazily on reads,
 * so this is only needed for timely order creation when nobody is looking. Protect with CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await settleExpired();
  return NextResponse.json({ ok: true, ...summary });
}
