"use client";

import { useEffect, useTransition } from "react";
import { markConversationRead } from "@/lib/actions/messages";

/**
 * Clears the unread state for this thread once it's actually on screen. Runs as a transition after
 * mount so the header badge and inbox markers update without a full reload.
 */
export function MarkRead({ conversationId, hasUnread }: { conversationId: string; hasUnread: boolean }) {
  const [, startTransition] = useTransition();
  useEffect(() => {
    if (!hasUnread) return;
    startTransition(() => markConversationRead(conversationId));
  }, [conversationId, hasUnread]);
  return null;
}
