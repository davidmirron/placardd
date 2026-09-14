import { formatDistanceToNowStrict, format } from "date-fns";

export function formatMoney(cents: number, opts: { compact?: boolean } = {}) {
  const dollars = cents / 100;
  if (opts.compact && dollars >= 10_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(dollars);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: dollars % 1 === 0 ? 0 : 2,
  }).format(dollars);
}

export function formatReach(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function formatDate(d: Date | number | null | undefined, pattern = "MMM d, yyyy") {
  if (!d) return "—";
  return format(d, pattern);
}

export function formatDateTime(d: Date | number | null | undefined) {
  return formatDate(d, "MMM d, yyyy · h:mm a");
}

export function timeUntil(d: Date | number) {
  const target = typeof d === "number" ? d : d.getTime();
  if (target <= Date.now()) return "Ended";
  return formatDistanceToNowStrict(target, { addSuffix: false });
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
