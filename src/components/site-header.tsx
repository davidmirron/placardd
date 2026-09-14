import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { MobileNav } from "@/components/mobile-nav";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  const links = [
    { href: "/listings", label: "Browse spots" },
    { href: "/how-it-works", label: "How it works" },
    ...(user?.role === "creator" ? [{ href: "/sell/new", label: "List a spot" }] : []),
    ...(user ? [{ href: "/dashboard", label: "Dashboard" }, { href: "/messages", label: "Messages" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Button key={l.href} asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Link href={l.href}>{l.label}</Link>
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <UserMenu
              user={{ name: user.name, handle: user.handle, avatarUrl: user.avatarUrl, role: user.role, companyName: user.companyName }}
            />
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          )}
          <MobileNav links={links} signedIn={!!user} />
        </div>
      </div>
    </header>
  );
}
