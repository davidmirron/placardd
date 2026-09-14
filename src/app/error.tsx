"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="text-sm font-medium text-destructive">Something went wrong</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">We couldn&apos;t load this page</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
