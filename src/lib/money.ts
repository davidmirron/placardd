import { PLATFORM_FEE_PERCENT } from "@/lib/constants";

/** Splits a gross amount into platform fee and seller payout. Rounded to whole cents. */
export function splitAmount(amountCents: number) {
  const feeCents = Math.round((amountCents * PLATFORM_FEE_PERCENT) / 100);
  return { amountCents, feeCents, sellerNetCents: amountCents - feeCents };
}
