"use client";

import { useActionState, useState } from "react";
import { Store, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { signup } from "@/lib/actions/auth";
import type { UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function SignupForm({ next, defaultRole }: { next: string; defaultRole: UserRole }) {
  const [state, action] = useActionState(signup, undefined);
  const [role, setRole] = useState<UserRole>(defaultRole);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="role" value={role} />

      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { value: "creator", icon: UserRound, title: "I'm a creator", body: "I want to sell ad space on my outfit, car, bag…" },
            { value: "brand", icon: Store, title: "I'm a brand", body: "I want to buy ad spots." },
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setRole(opt.value)}
            aria-pressed={role === opt.value}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              role === opt.value ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
            )}
          >
            <opt.icon className="mb-2 size-5" />
            <p className="text-sm font-medium">{opt.title}</p>
            <p className={cn("text-xs", role === opt.value ? "text-background/70" : "text-muted-foreground")}>{opt.body}</p>
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">{role === "brand" ? "Your name" : "Full name"}</Label>
        <Input id="name" name="name" required minLength={2} placeholder="Alex Rivera" autoComplete="name" />
      </div>
      {role === "brand" && (
        <div className="space-y-1.5">
          <Label htmlFor="companyName">Company or brand name</Label>
          <Input id="companyName" name="companyName" placeholder="Nova Wallet" autoComplete="organization" />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
      </div>

      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Creating account…">
        {role === "brand" ? "Create brand account" : "Create creator account"}
      </SubmitButton>
    </form>
  );
}
