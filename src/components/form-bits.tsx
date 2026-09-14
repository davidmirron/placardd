"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/actions/types";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingText,
  className,
  variant,
  size,
  disabled,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className={className} variant={variant} size={size}>
      {pending && <Loader2 className="animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (!state?.error && !state?.success) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={cn(
        "rounded-md px-3 py-2 text-sm",
        state.error ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
        className,
      )}
    >
      {state.error ?? state.success}
    </p>
  );
}
