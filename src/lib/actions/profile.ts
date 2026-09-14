"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { fieldNumber, fieldString, type ActionState } from "./types";

const schema = z.object({
  name: z.string().min(2).max(80),
  handle: z
    .string()
    .min(3, "Handle needs at least 3 characters.")
    .max(30)
    .regex(/^[a-z0-9-]+$/, "Handles can only use lowercase letters, numbers and dashes."),
  bio: z.string().max(600),
  location: z.string().max(120),
  website: z.string().max(200),
  socialHandle: z.string().max(60),
  followers: z.number().min(0),
  companyName: z.string().max(120),
  avatarUrl: z.string().max(400),
});

export async function updateProfile(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/settings");
  const parsed = schema.safeParse({
    name: fieldString(form, "name"),
    handle: fieldString(form, "handle").toLowerCase(),
    bio: fieldString(form, "bio"),
    location: fieldString(form, "location"),
    website: fieldString(form, "website"),
    socialHandle: fieldString(form, "socialHandle").replace(/^@/, ""),
    followers: fieldNumber(form, "followers"),
    companyName: fieldString(form, "companyName"),
    avatarUrl: fieldString(form, "avatarUrl"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;
  if (d.avatarUrl && !d.avatarUrl.startsWith("/api/files/")) return { error: "Invalid avatar." };

  const clash = await db.query.users.findFirst({ where: and(eq(users.handle, d.handle), ne(users.id, user.id)), columns: { id: true } });
  if (clash) return { error: "That handle is taken." };

  await db
    .update(users)
    .set({
      name: d.name,
      handle: d.handle,
      bio: d.bio || null,
      location: d.location || null,
      website: d.website || null,
      socialHandle: d.socialHandle || null,
      followers: Math.round(d.followers),
      companyName: user.role === "brand" ? d.companyName || null : null,
      avatarUrl: d.avatarUrl || user.avatarUrl,
    })
    .where(eq(users.id, user.id));
  revalidatePath("/settings");
  revalidatePath(`/u/${d.handle}`);
  return { success: "Profile updated." };
}
