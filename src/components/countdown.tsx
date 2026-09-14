"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

/** Current time in ms, ticking once per second. Returns 0 during server render and hydration. */
function useNow() {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => 0,
  );
}

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s, total };
}

export function Countdown({
  endsAt,
  className,
  endedLabel = "Ended",
  compact = false,
}: {
  endsAt: number | string | Date;
  className?: string;
  endedLabel?: string;
  compact?: boolean;
}) {
  const target = new Date(endsAt).getTime();
  const now = useNow();

  if (now === 0) return <span className={cn("tabular-nums", className)}>—</span>;
  const p = parts(target - now);
  if (p.total <= 0) return <span className={className}>{endedLabel}</span>;

  const urgent = p.total < 3600;
  const text = compact
    ? p.d > 0
      ? `${p.d}d ${p.h}h`
      : p.h > 0
        ? `${p.h}h ${p.m}m`
        : `${p.m}m ${String(p.s).padStart(2, "0")}s`
    : p.d > 0
      ? `${p.d}d ${p.h}h ${p.m}m`
      : `${String(p.h).padStart(2, "0")}:${String(p.m).padStart(2, "0")}:${String(p.s).padStart(2, "0")}`;

  return <span className={cn("tabular-nums", urgent && "text-brand", className)}>{text}</span>;
}
