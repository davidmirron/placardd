CREATE TABLE `bids` (
	`id` text PRIMARY KEY NOT NULL,
	`zone_id` text NOT NULL,
	`bidder_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bidder_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bids_zone_idx` ON `bids` (`zone_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `bids_bidder_idx` ON `bids` (`bidder_id`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text,
	`participant_a_id` text NOT NULL,
	`participant_b_id` text NOT NULL,
	`last_message_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`participant_a_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`participant_b_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `conversations_a_idx` ON `conversations` (`participant_a_id`);--> statement-breakpoint
CREATE INDEX `conversations_b_idx` ON `conversations` (`participant_b_id`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`event_name` text,
	`event_date` integer,
	`location` text DEFAULT '' NOT NULL,
	`bidding_ends_at` integer NOT NULL,
	`reach_in_person` integer DEFAULT 0 NOT NULL,
	`reach_social` integer DEFAULT 0 NOT NULL,
	`includes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `listings_status_idx` ON `listings` (`status`,`bidding_ends_at`);--> statement-breakpoint
CREATE INDEX `listings_seller_idx` ON `listings` (`seller_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `order_files` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`uploader_id` text NOT NULL,
	`kind` text NOT NULL,
	`url` text NOT NULL,
	`mime` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `order_files_order_idx` ON `order_files` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`zone_id` text NOT NULL,
	`listing_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`buyer_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`fee_cents` integer NOT NULL,
	`seller_net_cents` integer NOT NULL,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`payment_provider` text,
	`payment_ref` text,
	`brand_notes` text DEFAULT '' NOT NULL,
	`dispute_reason` text,
	`paid_at` integer,
	`proof_submitted_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `orders_buyer_idx` ON `orders` (`buyer_id`);--> statement-breakpoint
CREATE INDEX `orders_seller_idx` ON `orders` (`seller_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_zone_idx` ON `orders` (`zone_id`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`url` text NOT NULL,
	`label` text DEFAULT 'Photo' NOT NULL,
	`width` integer DEFAULT 0 NOT NULL,
	`height` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `photos_listing_idx` ON `photos` (`listing_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`author_id` text NOT NULL,
	`target_id` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_order_author_idx` ON `reviews` (`order_id`,`author_id`);--> statement-breakpoint
CREATE INDEX `reviews_target_idx` ON `reviews` (`target_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`role` text NOT NULL,
	`avatar_url` text,
	`bio` text,
	`location` text,
	`website` text,
	`social_handle` text,
	`followers` integer DEFAULT 0 NOT NULL,
	`company_name` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle_idx` ON `users` (`handle`);--> statement-breakpoint
CREATE TABLE `zones` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`photo_id` text NOT NULL,
	`label` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`w` real NOT NULL,
	`h` real NOT NULL,
	`sale_type` text DEFAULT 'auction' NOT NULL,
	`bid_rule` text DEFAULT 'increment' NOT NULL,
	`starting_price_cents` integer NOT NULL,
	`min_increment_cents` integer DEFAULT 2500 NOT NULL,
	`buy_now_price_cents` integer,
	`current_bid_cents` integer,
	`current_bidder_id` text,
	`bid_count` integer DEFAULT 0 NOT NULL,
	`ends_at` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`photo_id`) REFERENCES `photos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`current_bidder_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `zones_listing_idx` ON `zones` (`listing_id`);--> statement-breakpoint
CREATE INDEX `zones_status_idx` ON `zones` (`status`,`ends_at`);