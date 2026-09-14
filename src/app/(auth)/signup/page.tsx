import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "./signup-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/dashboard";
  const role = sp.role === "brand" ? "brand" : "creator";
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">Pick a side of the marketplace. You can always create a second account for the other side.</p>
        </div>
        <SignupForm next={next} defaultRole={role} />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
