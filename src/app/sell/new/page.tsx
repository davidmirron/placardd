import type { Metadata } from "next";
import { ListingForm } from "@/components/listing-form";
import { createListing } from "@/lib/actions/listings";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "List a spot" };

export default async function NewListingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/sell/new");
  if (user.role !== "creator") {
    return (
      <div className="container-page max-w-xl py-16 text-center">
        <h1 className="text-2xl font-semibold">Listings are for creator accounts</h1>
        <p className="mt-2 text-muted-foreground">You&apos;re signed in as a brand. Create a separate creator account to list your own spots.</p>
      </div>
    );
  }

  return (
    <div className="container-page max-w-3xl py-10 lg:py-14">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-medium text-brand">Step 1 of 3 · Details</p>
        <h1 className="text-3xl font-semibold tracking-tight">List a spot</h1>
        <p className="text-muted-foreground">Describe where you&apos;ll be seen. Next you&apos;ll add photos and draw the ad spots on them.</p>
      </div>
      <ListingForm action={createListing} submitLabel="Continue to photos" />
    </div>
  );
}
