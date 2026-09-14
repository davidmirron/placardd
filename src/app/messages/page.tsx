import Link from "next/link";
import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { requireUser } from "@/lib/auth";
import { formatDistanceToNowStrict } from "date-fns";
import { getConversationsForUser } from "@/lib/queries";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const conversations = await getConversationsForUser(user.id);

  return (
    <div className="container-page max-w-3xl space-y-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Messages</h1>
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
          {conversations.map((c) => (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50">
                <UserAvatar name={c.other.name} avatarUrl={c.other.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-medium">{c.other.companyName ?? c.other.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDistanceToNowStrict(c.lastMessageAt, { addSuffix: true })}</span>
                  </div>
                  {c.listing && <p className="truncate text-xs text-muted-foreground">Re: {c.listing.title}</p>}
                  <p className="truncate text-sm text-muted-foreground">
                    {c.last ? `${c.last.senderId === user.id ? "You: " : ""}${c.last.body}` : "No messages yet"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
