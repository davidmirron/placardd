"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { sendMessage } from "@/lib/actions/messages";

export function MessageComposer({ conversationId, onSent }: { conversationId: string; onSent?: () => void }) {
  const [state, action] = useActionState(sendMessage.bind(null, conversationId), undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.success) return;
    formRef.current?.reset();
    onSent?.();
  }, [state, onSent]);

  return (
    <form ref={formRef} action={action} className="mt-4 space-y-2">
      <div className="flex items-end gap-2">
        <Textarea
          name="body"
          rows={2}
          required
          placeholder="Write a message…"
          className="flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) formRef.current?.requestSubmit();
          }}
        />
        <SubmitButton size="lg" pendingText="Sending…">
          <Send /> Send
        </SubmitButton>
      </div>
      {state?.error && <FormMessage state={state} />}
    </form>
  );
}
