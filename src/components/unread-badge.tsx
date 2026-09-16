import { cn } from "@/lib/utils";

/** Small count pill used next to "Messages" wherever it appears in navigation. */
export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-brand-foreground tabular-nums", className)}
      aria-label={`${count} unread ${count === 1 ? "message" : "messages"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
