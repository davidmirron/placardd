import Link from "next/link";
import { Logo } from "@/components/logo";
import { APP_TAGLINE } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/listings" className="hover:text-foreground">Browse spots</Link>
          <Link href="/how-it-works" className="hover:text-foreground">How it works</Link>
          <Link href="/sell/new" className="hover:text-foreground">List a spot</Link>
          <Link href="/signup?role=brand" className="hover:text-foreground">For brands</Link>
        </nav>
      </div>
    </footer>
  );
}
