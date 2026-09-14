import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { ListingStatus, OrderStatus, ZoneStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const ORDER_STYLES: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  paid: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  proof_submitted: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  completed: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  disputed: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  cancelled: "bg-muted text-muted-foreground",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return <Badge className={cn("border-transparent", ORDER_STYLES[status], className)}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

const LISTING_STYLES: Record<ListingStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  ended: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  cancelled: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};
const LISTING_LABELS: Record<ListingStatus, string> = { draft: "Draft", active: "Live", ended: "Ended", cancelled: "Cancelled" };

export function ListingStatusBadge({ status, className }: { status: ListingStatus; className?: string }) {
  return <Badge className={cn("border-transparent", LISTING_STYLES[status], className)}>{LISTING_LABELS[status]}</Badge>;
}

const ZONE_LABELS: Record<ZoneStatus, string> = { open: "Open", sold: "Sold", unsold: "Unsold", cancelled: "Cancelled" };
export function ZoneStatusBadge({ status, className }: { status: ZoneStatus; className?: string }) {
  const style = status === "open" ? LISTING_STYLES.active : status === "sold" ? LISTING_STYLES.ended : LISTING_STYLES.draft;
  return <Badge className={cn("border-transparent", style, className)}>{ZONE_LABELS[status]}</Badge>;
}
