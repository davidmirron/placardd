import type { BidRule, ListingCategory, OrderStatus, SaleType } from "@/lib/db/schema";

export const APP_NAME = "Placard";
export const APP_TAGLINE = "Sell the space you already carry.";

export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 15);

/**
 * Auctions are built and tested but switched off for launch: a bid is a promise, not a payment,
 * so open bidding invites no-shows. Fixed price + immediate checkout only until brands can be
 * required to keep a verified card on file. Flip with NEXT_PUBLIC_AUCTIONS_ENABLED=true.
 */
export const AUCTIONS_ENABLED = process.env.NEXT_PUBLIC_AUCTIONS_ENABLED === "true";

/** Bids placed inside this window extend the auction by the same amount. */
export const ANTI_SNIPE_WINDOW_MS = 5 * 60 * 1000;

/** An auction winner learns asynchronously, so they get this long to pay. */
export const AUCTION_PAYMENT_WINDOW_MS = 48 * 60 * 60 * 1000;

/** A fixed-price buy is a checkout in progress; the spot is held only this long if payment never lands. */
export const BUY_NOW_HOLD_MS = 60 * 60 * 1000;

/**
 * Once a creator submits proof the brand has this long to approve or flag an issue. If they do neither,
 * the order completes and the payout is released automatically — a creator's money can't be held
 * hostage by a brand that simply stops replying.
 */
export const PROOF_REVIEW_WINDOW_DAYS = 7;
export const PROOF_REVIEW_WINDOW_MS = PROOF_REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * Reviews are sealed until both sides have posted, so nobody writes theirs in reaction to the other's.
 * If only one side reviews, theirs is revealed after this window so it isn't held hostage either.
 */
export const REVIEW_REVEAL_WINDOW_DAYS = 14;
export const REVIEW_REVEAL_WINDOW_MS = REVIEW_REVEAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Where disputes that the two parties can't settle between them get escalated. */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@placard.app";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  outfit: "Outfit & body",
  vehicle: "Vehicle",
  accessory: "Bag & accessories",
  space: "Booth & physical space",
  other: "Other",
};

export const CATEGORY_DESCRIPTIONS: Record<ListingCategory, string> = {
  outfit: "Dresses, jerseys, jackets, race kits, hats, temporary tattoos",
  vehicle: "Cars, bikes, vans, boats, helmets",
  accessory: "Bags, laptops, phone cases, water bottles",
  space: "Booth walls, signage, banners, apartment windows",
  other: "Anything else that will be seen",
};

export const SALE_TYPE_LABELS: Record<SaleType, string> = {
  auction: "Auction",
  buy_now: "Buy now",
};

export const BID_RULE_LABELS: Record<BidRule, string> = {
  increment: "Minimum increment",
  doubling: "Doubling bids",
};

export const BID_RULE_DESCRIPTIONS: Record<BidRule, string> = {
  increment: "Each new bid must beat the current bid by at least the minimum step.",
  doubling: "Each new bid must be at least double the current bid. Fast and dramatic.",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid · awaiting proof",
  proof_submitted: "Proof submitted",
  completed: "Completed",
  disputed: "Issue flagged",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export const PHOTO_LABELS = ["Front", "Back", "Left side", "Right side", "Detail", "Context"] as const;
