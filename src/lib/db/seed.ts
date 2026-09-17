import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { conversations, listings, messages, orders, photos, reviews, users, zones, type OrderStatus } from "./schema";
import { splitAmount } from "@/lib/money";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const DEMO_PASSWORD = "password123";

export async function seedIfEmpty() {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(users);
  if (Number(row?.count ?? 0) > 0) return false;
  await seed();
  return true;
}

export async function seed() {
  const now = Date.now();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const u = {
    vanessa: "u_vanessa",
    marcus: "u_marcus",
    sofia: "u_sofia",
    dev: "u_dev",
    nova: "u_nova",
    kite: "u_kite",
    pulse: "u_pulse",
  };

  await db.insert(users).values([
    {
      id: u.vanessa,
      email: "vanessa@demo.placard.app",
      passwordHash,
      name: "Vanessa Lin",
      handle: "vanessa",
      role: "creator",
      avatarUrl: "/demo/avatar-1.svg",
      bio: "Researcher and host. Speaking on two panels at SXSW. The dress is the billboard.",
      location: "Austin, TX",
      socialHandle: "vanessalin",
      followers: 48200,
      website: "https://vanessalin.xyz",
    },
    {
      id: u.marcus,
      email: "marcus@demo.placard.app",
      passwordHash,
      name: "Marcus Reed",
      handle: "marcus",
      role: "creator",
      avatarUrl: "/demo/avatar-2.svg",
      bio: "Sub-3 marathoner, 6 majors done. Every race is filmed for YouTube (110K subs).",
      location: "Berlin, Germany",
      socialHandle: "marcusruns",
      followers: 131000,
    },
    {
      id: u.sofia,
      email: "sofia@demo.placard.app",
      passwordHash,
      name: "Sofia Alvarez",
      handle: "sofia",
      role: "creator",
      avatarUrl: "/demo/avatar-3.svg",
      bio: "Miami-based creator. I drive to every art fair and film the whole week for TikTok.",
      location: "Miami, FL",
      socialHandle: "sofiadrives",
      followers: 262000,
    },
    {
      id: u.dev,
      email: "dev@demo.placard.app",
      passwordHash,
      name: "Dev Patel",
      handle: "dev",
      role: "creator",
      avatarUrl: "/demo/avatar-4.svg",
      bio: "Indie hacker. I sit in the front row of every talk and my laptop lid faces 3,000 people a day.",
      location: "Lisbon, Portugal",
      socialHandle: "devbuilds",
      followers: 9800,
    },
    {
      id: u.nova,
      email: "nova@demo.placard.app",
      passwordHash,
      name: "Priya Shah",
      handle: "nova-wallet",
      role: "brand",
      companyName: "Nova Wallet",
      avatarUrl: "/demo/avatar-5.svg",
      bio: "Self-custody wallet for people who don't want to think about self-custody.",
      location: "London, UK",
      website: "https://nova.example",
      socialHandle: "novawallet",
      followers: 84000,
    },
    {
      id: u.kite,
      email: "kite@demo.placard.app",
      passwordHash,
      name: "Tom Ekberg",
      handle: "kite-labs",
      role: "brand",
      companyName: "Kite Labs",
      avatarUrl: "/demo/avatar-6.svg",
      bio: "Dev tooling for on-chain teams. We sponsor humans, not banners.",
      location: "Stockholm, Sweden",
      website: "https://kite.example",
      socialHandle: "kitelabs",
      followers: 22000,
    },
    {
      id: u.pulse,
      email: "pulse@demo.placard.app",
      passwordHash,
      name: "Lena Ortiz",
      handle: "pulse-energy",
      role: "brand",
      companyName: "Pulse Energy",
      avatarUrl: "/demo/avatar-7.svg",
      bio: "Clean energy drink. Athletes, founders and night-shift nurses run on Pulse.",
      location: "Austin, TX",
      website: "https://pulse.example",
      socialHandle: "drinkpulse",
      followers: 310000,
    },
  ]);

  // Every demo spot is a fixed price (cents). The auction columns keep their defaults.
  type ZoneSeed = {
    id: string;
    photoId: string;
    label: string;
    description: string;
    x: number;
    y: number;
    w: number;
    h: number;
    price: number;
    sortOrder: number;
  };

  async function createListing(input: {
    id: string;
    sellerId: string;
    title: string;
    description: string;
    category: "outfit" | "vehicle" | "accessory" | "space" | "other";
    eventName: string;
    eventDate: number;
    location: string;
    biddingEndsAt: number;
    reachInPerson: number;
    reachSocial: number;
    includes: string;
    status?: "draft" | "active" | "ended";
    photos: { id: string; url: string; label: string; width: number; height: number }[];
    zones: ZoneSeed[];
    createdAt?: number;
  }) {
    const createdAt = new Date(input.createdAt ?? now - 3 * DAY);
    await db.insert(listings).values({
      id: input.id,
      sellerId: input.sellerId,
      title: input.title,
      description: input.description,
      category: input.category,
      eventName: input.eventName,
      eventDate: new Date(input.eventDate),
      location: input.location,
      biddingEndsAt: new Date(input.biddingEndsAt),
      reachInPerson: input.reachInPerson,
      reachSocial: input.reachSocial,
      includes: input.includes,
      status: input.status ?? "active",
      createdAt,
      updatedAt: createdAt,
    });
    await db.insert(photos).values(input.photos.map((p, i) => ({ ...p, listingId: input.id, sortOrder: i })));
    await db.insert(zones).values(
      input.zones.map((z) => ({
        id: z.id,
        listingId: input.id,
        photoId: z.photoId,
        label: z.label,
        description: z.description,
        x: z.x,
        y: z.y,
        w: z.w,
        h: z.h,
        saleType: "buy_now" as const,
        startingPriceCents: z.price,
        endsAt: new Date(input.biddingEndsAt),
        sortOrder: z.sortOrder,
      })),
    );
  }

  /** A brand bought a spot at its listed price and (unless told otherwise) has paid. */
  async function sold(input: {
    orderId: string;
    zoneId: string;
    listingId: string;
    sellerId: string;
    buyerId: string;
    amount: number;
    at: number;
    status?: OrderStatus;
    paymentRef: string;
    brandNotes?: string;
    proofSubmittedAt?: number;
    completedAt?: number;
  }) {
    await db.insert(orders).values({
      id: input.orderId,
      zoneId: input.zoneId,
      listingId: input.listingId,
      sellerId: input.sellerId,
      buyerId: input.buyerId,
      ...splitAmount(input.amount),
      status: input.status ?? "paid",
      paymentProvider: "mock",
      paymentRef: input.paymentRef,
      brandNotes: input.brandNotes ?? "",
      paidAt: new Date(input.at + 5 * 60 * 1000),
      proofSubmittedAt: input.proofSubmittedAt ? new Date(input.proofSubmittedAt) : null,
      completedAt: input.completedAt ? new Date(input.completedAt) : null,
      createdAt: new Date(input.at),
    });
    await db
      .update(zones)
      .set({ status: "sold", currentBidCents: input.amount, currentBidderId: input.buyerId })
      .where(sql`${zones.id} = ${input.zoneId}`);
  }

  // 1. A speaker-dress listing with several priced spots — the marketplace's flagship demo.
  const dressEnds = now + 6 * DAY + 5 * HOUR;
  await createListing({
    id: "l_token2049_dress",
    sellerId: u.vanessa,
    title: "SXSW Austin — logo spots on my speaker dress",
    description:
      "I'm speaking on two main-stage panels and hosting a closing party at SXSW. I'll wear this black column dress for the full two days plus the after-parties.\n\nEach spot gets a professionally heat-pressed logo in white or brand colour (I'll send proofs before printing). All sponsors are tagged in every outfit post on X and Instagram, listed on my personal site, and named in my panel intro.\n\nPrices are fixed — first brand to check out gets the spot. Spots come off sale six days before the event so the printer has time.",
    category: "outfit",
    eventName: "SXSW Austin",
    eventDate: now + 17 * DAY,
    location: "Austin, TX",
    biddingEndsAt: dressEnds,
    reachInPerson: 25000,
    reachSocial: 48200,
    includes: "Heat-pressed logo (up to 12cm)\nTagged in 4+ outfit posts on X and Instagram\nLogo + link on my website sponsors page\nName-check in my panel intro\nRaw photos and video for your own channels",
    photos: [
      { id: "p_dress_front", url: "/demo/dress-front.svg", label: "Front", width: 800, height: 1000 },
      { id: "p_dress_back", url: "/demo/dress-back.svg", label: "Back", width: 800, height: 1000 },
    ],
    zones: [
      { id: "z_dress_chest", photoId: "p_dress_front", label: "Front chest", description: "Most visible spot on camera and on stage. 12cm wide.", x: 0.4, y: 0.34, w: 0.2, h: 0.09, price: 280000, sortOrder: 0 },
      { id: "z_dress_waist", photoId: "p_dress_front", label: "Waist band", description: "Horizontal strip across the waist. Great for wordmarks.", x: 0.33, y: 0.55, w: 0.34, h: 0.06, price: 120000, sortOrder: 1 },
      { id: "z_dress_lhip", photoId: "p_dress_front", label: "Left hip panel", description: "Square logo, 10cm.", x: 0.27, y: 0.64, w: 0.17, h: 0.12, price: 90000, sortOrder: 2 },
      { id: "z_dress_rhip", photoId: "p_dress_front", label: "Right hip panel", description: "Square logo, 10cm.", x: 0.56, y: 0.64, w: 0.17, h: 0.12, price: 90000, sortOrder: 3 },
      { id: "z_dress_hem", photoId: "p_dress_front", label: "Hem strip", description: "Repeating wordmark along the hem. Shows in every full-length photo.", x: 0.26, y: 0.8, w: 0.48, h: 0.05, price: 150000, sortOrder: 4 },
      { id: "z_dress_upperback", photoId: "p_dress_back", label: "Upper back", description: "Visible while I'm seated on stage and in every crowd shot.", x: 0.38, y: 0.43, w: 0.24, h: 0.08, price: 140000, sortOrder: 5 },
      { id: "z_dress_backpanel", photoId: "p_dress_back", label: "Back skirt panel", description: "Largest single area on the dress.", x: 0.3, y: 0.6, w: 0.4, h: 0.16, price: 350000, sortOrder: 6 },
    ],
    createdAt: now - 2 * DAY,
  });
  await sold({
    orderId: "o_dress_chest",
    zoneId: "z_dress_chest",
    listingId: "l_token2049_dress",
    sellerId: u.vanessa,
    buyerId: u.kite,
    amount: 280000,
    at: now - 6 * HOUR,
    paymentRef: "test_seed_kite_chest",
    brandNotes: "Teal wordmark on the black fabric, please. Files attached on the order.",
  });
  await sold({
    orderId: "o_dress_upperback",
    zoneId: "z_dress_upperback",
    listingId: "l_token2049_dress",
    sellerId: u.vanessa,
    buyerId: u.pulse,
    amount: 140000,
    at: now - 20 * HOUR,
    paymentRef: "test_seed_pulse_upperback",
  });

  // 2. Marathon kit — comes off sale in a few hours.
  await createListing({
    id: "l_berlin_marathon",
    sellerId: u.marcus,
    title: "Berlin Marathon race kit — chest, shorts and finish-line video",
    description:
      "Running Berlin for a PB attempt. Full race is filmed by a two-person crew for my YouTube channel (average 180K views per race film) and I'm in the sub-elite start corral, so I'm on the broadcast start line.\n\nLogos are sublimated onto the singlet and shorts, so they look factory-made, not stuck on.",
    category: "outfit",
    eventName: "BMW Berlin Marathon",
    eventDate: now + 9 * DAY,
    location: "Berlin, Germany",
    biddingEndsAt: now + 3 * HOUR + 20 * 60 * 1000,
    reachInPerson: 1000000,
    reachSocial: 131000,
    includes: "Sublimated logo on race kit\nFeatured in race film (YouTube, 110K subs)\nTwo dedicated Instagram stories\nKit photos for your channels",
    photos: [{ id: "p_kit", url: "/demo/race-kit.svg", label: "Front", width: 800, height: 1000 }],
    zones: [
      { id: "z_kit_chest", photoId: "p_kit", label: "Chest strip", description: "Above the bib, dead centre in every finish photo.", x: 0.4, y: 0.36, w: 0.2, h: 0.06, price: 250000, sortOrder: 0 },
      { id: "z_kit_lower", photoId: "p_kit", label: "Lower singlet", description: "Below the bib.", x: 0.39, y: 0.55, w: 0.22, h: 0.05, price: 80000, sortOrder: 1 },
      { id: "z_kit_lshort", photoId: "p_kit", label: "Left shorts leg", description: "Side of shorts.", x: 0.37, y: 0.62, w: 0.1, h: 0.09, price: 20000, sortOrder: 2 },
      { id: "z_kit_rshort", photoId: "p_kit", label: "Right shorts leg", description: "Side of shorts.", x: 0.53, y: 0.62, w: 0.1, h: 0.09, price: 20000, sortOrder: 3 },
    ],
    createdAt: now - 6 * DAY,
  });
  await sold({
    orderId: "o_kit_chest",
    zoneId: "z_kit_chest",
    listingId: "l_berlin_marathon",
    sellerId: u.marcus,
    buyerId: u.pulse,
    amount: 250000,
    at: now - 1 * DAY,
    paymentRef: "test_seed_pulse_chest",
    brandNotes: "Full-colour Pulse can logo, centred above the bib.",
  });

  // 3. Art Basel car — one spot already bought and paid (awaiting the event).
  await createListing({
    id: "l_basel_car",
    sellerId: u.sofia,
    title: "Art Basel Miami week — door panels on my white Model 3",
    description:
      "I drive between every Art Basel Miami venue for seven days and park in the creator lot at the Convention Center. Vinyl-wrapped panels, professionally installed and removed.\n\nEvery day of the week gets a TikTok car-vlog (avg 400K views) with the car in frame.",
    category: "vehicle",
    eventName: "Art Basel Miami Beach",
    eventDate: now + 26 * DAY,
    location: "Miami, FL",
    biddingEndsAt: now + 12 * DAY,
    reachInPerson: 80000,
    reachSocial: 262000,
    includes: "Professionally installed vinyl panel\n7 daily TikTok vlogs with the car in frame\nParked in the creator lot at the Convention Center\nInstall and removal handled by me",
    photos: [{ id: "p_car", url: "/demo/car-side.svg", label: "Driver side", width: 1200, height: 700 }],
    zones: [
      { id: "z_car_rear_door", photoId: "p_car", label: "Rear door panel", description: "Largest flat panel. 90 × 45 cm.", x: 0.28, y: 0.53, w: 0.25, h: 0.13, price: 450000, sortOrder: 0 },
      { id: "z_car_front_door", photoId: "p_car", label: "Front door panel", description: "90 × 45 cm.", x: 0.55, y: 0.53, w: 0.27, h: 0.13, price: 450000, sortOrder: 1 },
      { id: "z_car_quarter", photoId: "p_car", label: "Rear quarter", description: "Behind the rear wheel. 45 × 35 cm.", x: 0.11, y: 0.55, w: 0.14, h: 0.1, price: 90000, sortOrder: 2 },
      { id: "z_car_window", photoId: "p_car", label: "Rear window", description: "Perforated see-through vinyl. Legal in FL.", x: 0.3, y: 0.37, w: 0.23, h: 0.13, price: 200000, sortOrder: 3 },
    ],
    createdAt: now - 4 * DAY,
  });
  await sold({
    orderId: "o_car_quarter",
    zoneId: "z_car_quarter",
    listingId: "l_basel_car",
    sellerId: u.sofia,
    buyerId: u.kite,
    amount: 90000,
    at: now - 2 * DAY - HOUR,
    paymentRef: "test_seed_kite_quarter",
    brandNotes: "Please use the white-on-transparent logo. Keep 3cm clear margin around the wheel arch.",
  });

  // 4. Laptop + tote at Web Summit — cheap, accessible listing.
  await createListing({
    id: "l_websummit_laptop",
    sellerId: u.dev,
    title: "Web Summit Lisbon — laptop lid and tote bag, 4 days front row",
    description:
      "I attend every main-stage session from the front row and work from the press lounge between talks. My laptop lid faces the room on every panel I sit in, and the tote goes everywhere I go.\n\nGood for developer tools and early-stage startups who want founders to notice them.",
    category: "accessory",
    eventName: "Web Summit Lisbon",
    eventDate: now + 40 * DAY,
    location: "Lisbon, Portugal",
    biddingEndsAt: now + 20 * DAY,
    reachInPerson: 70000,
    reachSocial: 9800,
    includes: "Printed vinyl sticker (laptop) or screen print (tote)\nDaily photo of the setup in my Web Summit thread on X\nHappy to hand out your stickers too",
    photos: [
      { id: "p_laptop", url: "/demo/laptop.svg", label: "Laptop lid", width: 1200, height: 800 },
      { id: "p_tote", url: "/demo/tote-bag.svg", label: "Tote bag", width: 800, height: 1000 },
    ],
    zones: [
      { id: "z_laptop_upper", photoId: "p_laptop", label: "Upper lid", description: "Above the logo cut-out. 25 × 10 cm.", x: 0.28, y: 0.18, w: 0.44, h: 0.22, price: 40000, sortOrder: 0 },
      { id: "z_laptop_lower", photoId: "p_laptop", label: "Lower lid", description: "Below the logo cut-out. 25 × 10 cm.", x: 0.28, y: 0.56, w: 0.44, h: 0.2, price: 40000, sortOrder: 1 },
      { id: "z_tote_front", photoId: "p_tote", label: "Tote front", description: "Full front print area, 30 × 30 cm.", x: 0.28, y: 0.4, w: 0.44, h: 0.3, price: 50000, sortOrder: 2 },
      { id: "z_tote_bottom", photoId: "p_tote", label: "Tote bottom strip", description: "Wordmark along the bottom.", x: 0.24, y: 0.76, w: 0.52, h: 0.08, price: 8000, sortOrder: 3 },
    ],
    createdAt: now - 1 * DAY,
  });

  // 5. A finished listing with a completed order and reviews, so profiles have history.
  await createListing({
    id: "l_ethglobal_laptop",
    sellerId: u.dev,
    title: "ETHGlobal Brussels hackathon — laptop lid for 48 hours of hacking",
    description: "Hacked non-stop at ETHGlobal Brussels with the lid facing the main hall.",
    category: "accessory",
    eventName: "ETHGlobal Brussels",
    eventDate: now - 30 * DAY,
    location: "Brussels, Belgium",
    biddingEndsAt: now - 40 * DAY,
    reachInPerson: 1500,
    reachSocial: 9800,
    includes: "Printed vinyl sticker\nPhoto in my hackathon recap thread",
    status: "ended",
    photos: [{ id: "p_eth_laptop", url: "/demo/laptop.svg", label: "Laptop lid", width: 1200, height: 800 }],
    zones: [{ id: "z_eth_lid", photoId: "p_eth_laptop", label: "Full lid", description: "Whole lid.", x: 0.28, y: 0.18, w: 0.44, h: 0.58, price: 12500, sortOrder: 0 }],
    createdAt: now - 50 * DAY,
  });
  await sold({
    orderId: "o_eth_lid",
    zoneId: "z_eth_lid",
    listingId: "l_ethglobal_laptop",
    sellerId: u.dev,
    buyerId: u.nova,
    amount: 12500,
    at: now - 40 * DAY,
    status: "completed",
    paymentRef: "test_seed_nova_lid",
    brandNotes: "Dark logo on the silver lid please.",
    proofSubmittedAt: now - 28 * DAY,
    completedAt: now - 27 * DAY,
  });
  {
    await db.insert(reviews).values([
      {
        id: "r_eth_1",
        orderId: "o_eth_lid",
        authorId: u.nova,
        targetId: u.dev,
        rating: 5,
        comment: "Dev sent proof photos from the hall within a day of the event and the recap thread did 60K impressions. Would sponsor again.",
        createdAt: new Date(now - 27 * DAY),
        publishedAt: new Date(now - 26 * DAY),
      },
      {
        id: "r_eth_2",
        orderId: "o_eth_lid",
        authorId: u.dev,
        targetId: u.nova,
        rating: 5,
        comment: "Assets arrived print-ready, paid instantly, easy to work with.",
        createdAt: new Date(now - 26 * DAY),
        publishedAt: new Date(now - 26 * DAY),
      },
    ]);
  }

  // A conversation about the dress. Kite has read everything; Vanessa hasn't opened Kite's last message yet,
  // so her account shows one unread on first login.
  await db.insert(conversations).values({
    id: "c_dress_kite",
    listingId: "l_token2049_dress",
    participantAId: u.kite,
    participantBId: u.vanessa,
    lastMessageAt: new Date(now - 5 * HOUR),
    participantAReadAt: new Date(now - 5 * HOUR),
    participantBReadAt: new Date(now - 28 * HOUR),
    createdAt: new Date(now - 30 * HOUR),
  });
  await db.insert(messages).values([
    { id: "m1", conversationId: "c_dress_kite", senderId: u.kite, body: "Hey Vanessa — can the front chest logo be printed in our brand teal rather than white?", createdAt: new Date(now - 30 * HOUR) },
    { id: "m2", conversationId: "c_dress_kite", senderId: u.vanessa, body: "Yes, any single colour works on the black fabric. I'll send a mock-up before printing.", createdAt: new Date(now - 29 * HOUR) },
    { id: "m3", conversationId: "c_dress_kite", senderId: u.kite, body: "Perfect. Just bought the front chest spot — teal logo files are on the order now.", createdAt: new Date(now - 5 * HOUR) },
  ]);
}
