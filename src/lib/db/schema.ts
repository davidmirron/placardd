import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const USER_ROLES = ["creator", "brand"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const LISTING_CATEGORIES = [
  "outfit",
  "vehicle",
  "accessory",
  "space",
  "other",
] as const;
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export const LISTING_STATUSES = ["draft", "active", "ended", "cancelled"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const SALE_TYPES = ["auction", "buy_now"] as const;
export type SaleType = (typeof SALE_TYPES)[number];

export const BID_RULES = ["increment", "doubling"] as const;
export type BidRule = (typeof BID_RULES)[number];

export const ZONE_STATUSES = ["open", "sold", "unsold", "cancelled"] as const;
export type ZoneStatus = (typeof ZONE_STATUSES)[number];

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "proof_submitted",
  "completed",
  "disputed",
  "refunded",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Orders in these states no longer hold their zone, so the zone can be sold again. */
export const RELEASED_ORDER_STATUSES: readonly OrderStatus[] = ["cancelled", "refunded"];

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const now = sql`(unixepoch('subsec') * 1000)`;

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    role: text("role", { enum: USER_ROLES }).notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    location: text("location"),
    website: text("website"),
    socialHandle: text("social_handle"),
    followers: integer("followers").notNull().default(0),
    companyName: text("company_name"),
    createdAt: timestamp("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), uniqueIndex("users_handle_idx").on(t.handle)],
);

export const listings = sqliteTable(
  "listings",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: text("category", { enum: LISTING_CATEGORIES }).notNull(),
    eventName: text("event_name"),
    eventDate: timestamp("event_date"),
    location: text("location").notNull().default(""),
    biddingEndsAt: timestamp("bidding_ends_at").notNull(),
    reachInPerson: integer("reach_in_person").notNull().default(0),
    reachSocial: integer("reach_social").notNull().default(0),
    includes: text("includes").notNull().default(""),
    status: text("status", { enum: LISTING_STATUSES }).notNull().default("draft"),
    createdAt: timestamp("created_at").notNull().default(now),
    updatedAt: timestamp("updated_at").notNull().default(now),
  },
  (t) => [index("listings_status_idx").on(t.status, t.biddingEndsAt), index("listings_seller_idx").on(t.sellerId)],
);

export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    label: text("label").notNull().default("Photo"),
    width: integer("width").notNull().default(0),
    height: integer("height").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().default(now),
  },
  (t) => [index("photos_listing_idx").on(t.listingId)],
);

export const zones = sqliteTable(
  "zones",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    photoId: text("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    description: text("description").notNull().default(""),
    // Normalised 0..1 fractions of the photo so overlays scale with any render size.
    x: real("x").notNull(),
    y: real("y").notNull(),
    w: real("w").notNull(),
    h: real("h").notNull(),
    saleType: text("sale_type", { enum: SALE_TYPES }).notNull().default("auction"),
    bidRule: text("bid_rule", { enum: BID_RULES }).notNull().default("increment"),
    startingPriceCents: integer("starting_price_cents").notNull(),
    minIncrementCents: integer("min_increment_cents").notNull().default(2500),
    buyNowPriceCents: integer("buy_now_price_cents"),
    currentBidCents: integer("current_bid_cents"),
    currentBidderId: text("current_bidder_id").references(() => users.id),
    bidCount: integer("bid_count").notNull().default(0),
    endsAt: timestamp("ends_at").notNull(),
    status: text("status", { enum: ZONE_STATUSES }).notNull().default("open"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().default(now),
  },
  (t) => [index("zones_listing_idx").on(t.listingId), index("zones_status_idx").on(t.status, t.endsAt)],
);

export const bids = sqliteTable(
  "bids",
  {
    id: text("id").primaryKey(),
    zoneId: text("zone_id")
      .notNull()
      .references(() => zones.id, { onDelete: "cascade" }),
    bidderId: text("bidder_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    createdAt: timestamp("created_at").notNull().default(now),
  },
  (t) => [index("bids_zone_idx").on(t.zoneId, t.createdAt), index("bids_bidder_idx").on(t.bidderId)],
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    zoneId: text("zone_id")
      .notNull()
      .references(() => zones.id, { onDelete: "cascade" }),
    // Extra spots on the same listing bought in this order. JSON string array of zone ids.
    additionalZoneIds: text("additional_zone_ids").notNull().default("[]"),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    sellerId: text("seller_id")
      .notNull()
      .references(() => users.id),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => users.id),
    amountCents: integer("amount_cents").notNull(),
    feeCents: integer("fee_cents").notNull(),
    sellerNetCents: integer("seller_net_cents").notNull(),
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("pending_payment"),
    paymentProvider: text("payment_provider"),
    paymentRef: text("payment_ref"),
    brandNotes: text("brand_notes").notNull().default(""),
    disputeReason: text("dispute_reason"),
    disputedAt: timestamp("disputed_at"),
    refundRef: text("refund_ref"),
    refundedAt: timestamp("refunded_at"),
    paidAt: timestamp("paid_at"),
    proofSubmittedAt: timestamp("proof_submitted_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().default(now),
  },
  (t) => [
    index("orders_buyer_idx").on(t.buyerId),
    index("orders_seller_idx").on(t.sellerId),
    // A zone can only have one live order at a time; released orders (expired holds, refunds) keep their row
    // for the record but no longer block a resale.
    uniqueIndex("orders_zone_live_idx")
      .on(t.zoneId)
      .where(sql`status NOT IN ('cancelled', 'refunded')`),
  ],
);

export const orderFiles = sqliteTable(
  "order_files",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    uploaderId: text("uploader_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind", { enum: ["asset", "proof"] }).notNull(),
    url: text("url").notNull(),
    mime: text("mime").notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at").notNull().default(now),
  },
  (t) => [index("order_files_order_idx").on(t.orderId)],
);

export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    targetId: text("target_id")
      .notNull()
      .references(() => users.id),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    // Reviews are double-blind: hidden from everyone but the author until both sides have posted,
    // or until the reveal window runs out. Null means still sealed.
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("reviews_order_author_idx").on(t.orderId, t.authorId), index("reviews_target_idx").on(t.targetId)],
);

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id").references(() => listings.id, { onDelete: "set null" }),
    participantAId: text("participant_a_id")
      .notNull()
      .references(() => users.id),
    participantBId: text("participant_b_id")
      .notNull()
      .references(() => users.id),
    lastMessageAt: timestamp("last_message_at").notNull().default(now),
    // Read receipts: when each participant last opened the thread. Messages newer than this are unread.
    participantAReadAt: timestamp("participant_a_read_at"),
    participantBReadAt: timestamp("participant_b_read_at"),
    createdAt: timestamp("created_at").notNull().default(now),
  },
  (t) => [index("conversations_a_idx").on(t.participantAId), index("conversations_b_idx").on(t.participantBId)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().default(now),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

export const usersRelations = relations(users, ({ many }) => ({
  listings: many(listings),
  bids: many(bids),
  reviewsReceived: many(reviews, { relationName: "reviewTarget" }),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  seller: one(users, { fields: [listings.sellerId], references: [users.id] }),
  photos: many(photos),
  zones: many(zones),
  orders: many(orders),
}));

export const photosRelations = relations(photos, ({ one, many }) => ({
  listing: one(listings, { fields: [photos.listingId], references: [listings.id] }),
  zones: many(zones),
}));

export const zonesRelations = relations(zones, ({ one, many }) => ({
  listing: one(listings, { fields: [zones.listingId], references: [listings.id] }),
  photo: one(photos, { fields: [zones.photoId], references: [photos.id] }),
  currentBidder: one(users, { fields: [zones.currentBidderId], references: [users.id] }),
  bids: many(bids),
  orders: many(orders),
}));

export const bidsRelations = relations(bids, ({ one }) => ({
  zone: one(zones, { fields: [bids.zoneId], references: [zones.id] }),
  bidder: one(users, { fields: [bids.bidderId], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  zone: one(zones, { fields: [orders.zoneId], references: [zones.id] }),
  listing: one(listings, { fields: [orders.listingId], references: [listings.id] }),
  seller: one(users, { fields: [orders.sellerId], references: [users.id], relationName: "orderSeller" }),
  buyer: one(users, { fields: [orders.buyerId], references: [users.id], relationName: "orderBuyer" }),
  files: many(orderFiles),
  reviews: many(reviews),
}));

export const orderFilesRelations = relations(orderFiles, ({ one }) => ({
  order: one(orders, { fields: [orderFiles.orderId], references: [orders.id] }),
  uploader: one(users, { fields: [orderFiles.uploaderId], references: [users.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  order: one(orders, { fields: [reviews.orderId], references: [orders.id] }),
  author: one(users, { fields: [reviews.authorId], references: [users.id], relationName: "reviewAuthor" }),
  target: one(users, { fields: [reviews.targetId], references: [users.id], relationName: "reviewTarget" }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  listing: one(listings, { fields: [conversations.listingId], references: [listings.id] }),
  participantA: one(users, { fields: [conversations.participantAId], references: [users.id], relationName: "convA" }),
  participantB: one(users, { fields: [conversations.participantBId], references: [users.id], relationName: "convB" }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Zone = typeof zones.$inferSelect;
export type Bid = typeof bids.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderFile = typeof orderFiles.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
