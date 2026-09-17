"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listConversationMessages, markConversationRead, type ThreadMessage } from "@/lib/actions/messages";
import { MessageComposer } from "./message-composer";
import { MessageThread } from "./message-thread";

const POLL_MS = 2500;

function ids(messages: ThreadMessage[]) {
  return messages.map((m) => m.id).join();
}

export function ConversationChat({
  conversationId,
  viewerId,
  initialMessages,
  firstUnreadId,
}: {
  conversationId: string;
  viewerId: string;
  initialMessages: ThreadMessage[];
  firstUnreadId: string | null;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const endRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef(new Set(initialMessages.map((m) => m.id)));

  const apply = useCallback(
    (latest: ThreadMessage[]) => {
      setMessages((prev) => {
        if (ids(prev) === ids(latest)) return prev;
        const hasNewIncoming = latest.some((m) => !seenIds.current.has(m.id) && m.senderId !== viewerId);
        for (const m of latest) seenIds.current.add(m.id);
        if (hasNewIncoming) void markConversationRead(conversationId);
        return latest;
      });
    },
    [conversationId, viewerId],
  );

  const pull = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    try {
      const latest = await listConversationMessages(conversationId);
      if (latest) apply(latest);
    } catch {
      // Next poll retries. Don't unmount the thread on a blip.
    }
  }, [apply, conversationId]);

  useEffect(() => {
    apply(initialMessages);
  }, [apply, initialMessages]);

  useEffect(() => {
    const timer = setInterval(pull, POLL_MS);
    document.addEventListener("visibilitychange", pull);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", pull);
    };
  }, [pull]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border p-4">
        <div className="mt-auto space-y-3">
          <MessageThread messages={messages} viewerId={viewerId} firstUnreadId={firstUnreadId} />
          <div ref={endRef} />
        </div>
      </div>
      <MessageComposer conversationId={conversationId} onSent={pull} />
    </>
  );
}
