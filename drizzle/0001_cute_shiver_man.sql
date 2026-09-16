DROP INDEX `orders_zone_idx`;--> statement-breakpoint
ALTER TABLE `orders` ADD `disputed_at` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `refund_ref` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `refunded_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_zone_live_idx` ON `orders` (`zone_id`) WHERE status NOT IN ('cancelled', 'refunded');--> statement-breakpoint
ALTER TABLE `conversations` ADD `participant_a_read_at` integer;--> statement-breakpoint
ALTER TABLE `conversations` ADD `participant_b_read_at` integer;--> statement-breakpoint
ALTER TABLE `reviews` ADD `published_at` integer;