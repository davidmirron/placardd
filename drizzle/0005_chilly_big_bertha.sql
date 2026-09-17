DROP INDEX `orders_zone_live_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_zone_live_idx` ON `orders` (`zone_id`) WHERE status NOT IN ('cancelled', 'refunded', 'pending_payment');