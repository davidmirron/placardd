import { BadgeCheck, LifeBuoy, Lock, ShieldCheck } from "lucide-react";
import { PROOF_REVIEW_WINDOW_DAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * The reason to transact through Placard rather than around it, stated as what you get — never as a fee.
 * The price a brand sees is the price; the payout a creator sees is the payout. Nobody is invited to do the math.
 */
export function ProtectedByPlacard({ audience, className }: { audience: "brand" | "creator"; className?: string }) {
  const points =
    audience === "brand"
      ? [
          { icon: Lock, text: "Your payment is held by Placard, not handed to the creator." },
          { icon: BadgeCheck, text: "It's released only when you approve proof of delivery." },
          { icon: LifeBuoy, text: "Something wrong? Flag it and the payout pauses. Full refund if it can't be fixed." },
        ]
      : [
          { icon: Lock, text: "The brand pays up front. No invoices, no chasing." },
          { icon: BadgeCheck, text: `Your payout is released on approval, or automatically ${PROOF_REVIEW_WINDOW_DAYS} days after you submit proof.` },
          { icon: LifeBuoy, text: "If an issue is raised, you see it and can put it right. Placard steps in if you can't agree." },
        ];

  return (
    <div className={cn("rounded-2xl border bg-muted/40 p-5 text-sm", className)}>
      <p className="mb-3 flex items-center gap-2 font-semibold">
        <ShieldCheck className="size-4 text-brand" /> Protected by Placard
      </p>
      <ul className="space-y-2.5 text-muted-foreground">
        {points.map((p) => (
          <li key={p.text} className="flex gap-2.5">
            <p.icon className="mt-0.5 size-4 shrink-0 text-foreground/60" />
            <span>{p.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
