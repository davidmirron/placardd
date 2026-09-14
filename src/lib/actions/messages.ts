"use server";

import { and, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { fieldString, type ActionState } from "./types";

/** Finds or creates the thread between the current user and another user (optionally about a listing). */
export async function startConversation(otherUserId: string, listingId?: string) {
  const user = await requireUser();
  if (otherUserId === user.id) redirect("/messages");

  const existing = await db.query.conversations.findFirst({
    where: and(
      or(
        and(eq(conversations.participantAId, user.id), eq(conversations.participantBId, otherUserId)),
        and(eq(conversations.participantAId, otherUserId), eq(conversations.participantBId, user.id)),
      ),
      listingId ? eq(conversations.listingId, listingId) : undefined,
    ),
  });
  if (existing) redirect(`/messages/${existing.id}`);

  const id = nanoid(12);
  await db.insert(conversations).values({ id, participantAId: user.id, participantBId: otherUserId, listingId: listingId ?? null });
  redirect(`/messages/${id}`);
}

export async function sendMessage(conversationId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const body = fieldString(form, "body");
  if (!body) return { error: "Write a message first." };
  const convo = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
  if (!convo || (convo.participantAId !== user.id && convo.participantBId !== user.id)) return { error: "Conversation not found." };

  await db.transaction(async (tx) => {
    await tx.insert(messages).values({ id: nanoid(12), conversationId, senderId: user.id, body: body.slice(0, 4000) });
    await tx.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));
  });
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { success: "sent" };
}
