import Link from "next/link";
import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { requireUser } from "@/lib/auth";
import { formatDistanceToNowStrict } from "date-fns";
import { getConversationsForUser } from "@/lib/queries";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const conversations = await getConversationsForUser(user.id);
  const unreadThreads = conversations.filter((c) => c.unreadCount > 0).length;

  return (
    <div className="container-page max-w-3xl space-y-6 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Messages</h1>
        {unreadThreads > 0 && <p className="text-sm text-muted-foreground">{pluralize(unreadThreads, "conversation")} with new messages</p>}
      </div>
      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <MessageSquare className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">No conversations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Open any listing and hit Message to ask about sizes, colours or placement before you buy.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/listings">Browse listings</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {conversations.map((c) => {
            const unread = c.unreadCount > 0;
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className={cn("flex items-center gap-4 px-5 py-4 hover:bg-muted/50", unread && "bg-brand-soft/30")}>
                  <div className="relative shrink-0">
                    <UserAvatar name={c.other.name} avatarUrl={c.other.avatarUrl} />
                    {unread && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-brand ring-2 ring-background" aria-hidden />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={cn("truncate", unread ? "font-semibold" : "font-medium")}>{c.other.companyName ?? c.other.name}</p>
                      <span className={cn("shrink-0 text-xs", unread ? "font-medium text-brand" : "text-muted-foreground")}>
                        {formatDistanceToNowStrict(c.lastMessageAt, { addSuffix: true })}
                      </span>
                    </div>
                    {c.listing && <p className="truncate text-xs text-muted-foreground">Re: {c.listing.title}</p>}
                    <p className={cn("truncate text-sm", unread ? "text-foreground" : "text-muted-foreground")}>
                      {c.last ? `${c.last.senderId === user.id ? "You: " : ""}${c.last.body}` : "No messages yet"}
                    </p>
                  </div>
                  {unread && (
                    <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-brand-foreground tabular-nums" aria-label={pluralize(c.unreadCount, "new message")}>
                      {c.unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
