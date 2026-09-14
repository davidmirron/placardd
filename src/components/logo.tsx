import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="relative flex size-7 items-center justify-center rounded-md bg-foreground text-background">
        <span className="absolute inset-[5px] rounded-[2px] border-2 border-brand" />
      </span>
      {!compact && <span className="text-lg">{APP_NAME}</span>}
    </Link>
  );
}
