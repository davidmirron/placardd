"use server";

import { and, asc, eq, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { fieldString, type ActionState } from "./types";

export type ThreadMessage = { id: string; senderId: string; body: string; createdAt: number };

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

function readAtColumn(convo: { participantAId: string }, userId: string) {
  return convo.participantAId === userId ? { participantAReadAt: new Date() } : { participantBReadAt: new Date() };
}

export async function sendMessage(conversationId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const body = fieldString(form, "body");
  if (!body) return { error: "Write a message first." };
  const convo = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
  if (!convo || (convo.participantAId !== user.id && convo.participantBId !== user.id)) return { error: "Conversation not found." };

  await db.transaction(async (tx) => {
    await tx.insert(messages).values({ id: nanoid(12), conversationId, senderId: user.id, body: body.slice(0, 4000) });
    // Replying implies you've read everything above, so the sender's receipt moves too.
    await tx
      .update(conversations)
      .set({ lastMessageAt: new Date(), ...readAtColumn(convo, user.id) })
      .where(eq(conversations.id, conversationId));
  });
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { success: "sent" };
}

/** Lightweight poll for an open thread so new messages show up without a full reload. */
export async function listConversationMessages(conversationId: string): Promise<ThreadMessage[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const convo = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    columns: { id: true, participantAId: true, participantBId: true },
    with: {
      messages: {
        orderBy: asc(sql`created_at`),
        columns: { id: true, senderId: true, body: true, createdAt: true },
      },
    },
  });
  if (!convo || (convo.participantAId !== user.id && convo.participantBId !== user.id)) return null;
  return convo.messages.map((m) => ({ id: m.id, senderId: m.senderId, body: m.body, createdAt: m.createdAt.getTime() }));
}

/** Called when a thread is opened so its messages stop counting as unread everywhere. */
export async function markConversationRead(conversationId: string): Promise<void> {
  const user = await requireUser();
  const convo = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
  if (!convo || (convo.participantAId !== user.id && convo.participantBId !== user.id)) return;
  await db.update(conversations).set(readAtColumn(convo, user.id)).where(eq(conversations.id, conversationId));
  // The unread badge lives in the root layout, so refresh from the top.
  revalidatePath("/", "layout");
}
