"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/logo";
import { UnreadBadge } from "@/components/unread-badge";

export function MobileNav({ links, signedIn }: { links: { href: string; label: string; badge?: number }[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const totalBadge = links.reduce((n, l) => n + (l.badge ?? 0), 0);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative md:hidden" aria-label={totalBadge ? `Open menu, ${totalBadge} unread messages` : "Open menu"}>
          <Menu />
          {totalBadge > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand" aria-hidden />}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle asChild>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-md px-3 py-2 text-base font-medium hover:bg-muted"
            >
              {l.label}
              {!!l.badge && <UnreadBadge count={l.badge} />}
            </Link>
          ))}
          {!signedIn && (
            <div className="mt-4 flex flex-col gap-2 border-t pt-4">
              <Button asChild variant="outline" onClick={() => setOpen(false)}>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild onClick={() => setOpen(false)}>
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
