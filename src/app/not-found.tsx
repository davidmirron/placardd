import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="text-sm font-medium text-brand">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">That spot doesn&apos;t exist</h1>
      <p className="mt-2 max-w-md text-muted-foreground">The page you&apos;re looking for was moved, sold out, or never existed.</p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href="/listings">Browse live spots</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
