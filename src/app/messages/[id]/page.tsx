import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { MessageComposer } from "./message-composer";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { getConversation } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const convo = await getConversation(id, user.id);
  if (!convo) notFound();

  return (
    <div className="container-page flex max-w-3xl flex-col py-8" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
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

      <div className="flex-1 space-y-3 rounded-2xl border p-4">
        {convo.messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Say hello. Ask about sizes, colours, timing — anything before you commit.</p>}
        {convo.messages.map((m) => {
          const mine = m.senderId === user.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-4 py-2 text-sm", mine ? "bg-foreground text-background" : "bg-muted")}>
                <p className="whitespace-pre-line">{m.body}</p>
                <p className={cn("mt-1 text-[10px]", mine ? "text-background/60" : "text-muted-foreground")}>{formatDateTime(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <MessageComposer conversationId={convo.id} />
    </div>
  );
}
