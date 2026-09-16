"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut, MessageSquare, Settings, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UnreadBadge } from "@/components/unread-badge";
import { UserAvatar } from "@/components/user-avatar";
import { logout } from "@/lib/actions/auth";

type Props = {
  user: { name: string; handle: string; avatarUrl: string | null; role: "creator" | "brand"; companyName: string | null };
  unread?: number;
};

export function UserMenu({ user, unread = 0 }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label={unread ? `Account menu, ${unread} unread messages` : "Account menu"}>
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="size-8" />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-brand ring-2 ring-background" aria-hidden />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-medium">{user.companyName ?? user.name}</span>
          <span className="text-xs font-normal text-muted-foreground">
            @{user.handle} · {user.role === "brand" ? "Brand" : "Creator"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard /> Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/messages">
            <MessageSquare /> Messages
            <UnreadBadge count={unread} className="ml-auto" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/u/${user.handle}`}>
            <UserRound /> Public profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout()}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
