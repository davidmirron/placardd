"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type ThreadMessage = { id: string; senderId: string; body: string; createdAt: number };

/**
 * Renders the messages with a "New" divider above the first one the viewer hadn't seen.
 * Opening the thread marks it read and refreshes the page, which would make the server forget where
 * the divider goes — so the position is latched in client state on first render and kept for the visit.
 */
export function MessageThread({ messages, viewerId, firstUnreadId }: { messages: ThreadMessage[]; viewerId: string; firstUnreadId: string | null }) {
  const [dividerId] = useState(firstUnreadId);

  if (messages.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Say hello. Ask about sizes, colours, timing — anything before you commit.</p>;
  }

  return (
    <>
      {messages.map((m) => {
        const mine = m.senderId === viewerId;
        return (
          <div key={m.id}>
            {m.id === dividerId && (
              <div className="my-2 flex items-center gap-3 text-[11px] font-medium tracking-wide text-brand uppercase" role="separator">
                <span className="h-px flex-1 bg-brand/40" />
                New
                <span className="h-px flex-1 bg-brand/40" />
              </div>
            )}
            <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-4 py-2 text-sm", mine ? "bg-foreground text-background" : "bg-muted")}>
                <p className="whitespace-pre-line">{m.body}</p>
                <p className={cn("mt-1 text-[10px]", mine ? "text-background/60" : "text-muted-foreground")}>{formatDateTime(m.createdAt)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
