ALTER TABLE `listings` ADD `event_attendance` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `audience_profile` text DEFAULT '' NOT NULL;