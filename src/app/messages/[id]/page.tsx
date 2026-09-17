import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { ConversationChat } from "./conversation-chat";
import { MarkRead } from "./mark-read";
import { requireUser } from "@/lib/auth";
import { getConversation, readAtFor } from "@/lib/queries";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const convo = await getConversation(id, user.id);
  if (!convo) notFound();

  const readAt = readAtFor(convo, user.id)?.getTime() ?? 0;
  const firstUnreadId = convo.messages.find((m) => m.senderId !== user.id && m.createdAt.getTime() > readAt)?.id ?? null;

  return (
    <div className="container-page flex max-w-3xl flex-col py-8" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
      <MarkRead conversationId={convo.id} hasUnread={firstUnreadId !== null} />
      <div className="mb-4 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Back to messages">
          <Link href="/messages">
            <ArrowLeft />
          </Link>
        </Button>
        <UserAvatar name={convo.other.name} avatarUrl={convo.other.avatarUrl} />
        <div className="min-w-0">
          <Link href={`/u/${convo.other.handle}`} className="block truncate font-semibold hover:underline">
            {convo.other.companyName ?? convo.other.name}
          </Link>
          {convo.listing && (
            <Link href={`/listings/${convo.listing.id}`} className="block truncate text-xs text-muted-foreground hover:underline">
              Re: {convo.listing.title}
            </Link>
          )}
        </div>
      </div>

      <ConversationChat
        conversationId={convo.id}
        viewerId={user.id}
        firstUnreadId={firstUnreadId}
        initialMessages={convo.messages.map((m) => ({ id: m.id, senderId: m.senderId, body: m.body, createdAt: m.createdAt.getTime() }))}
      />
    </div>
  );
}
