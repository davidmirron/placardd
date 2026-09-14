import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/dashboard";
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage your spots and orders.</p>
        </div>
        <LoginForm next={next} />
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href={`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
        <div className="rounded-xl border bg-muted/40 p-4 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Demo accounts (password: password123)</p>
          <p>Creator: vanessa@demo.placard.app</p>
          <p>Brand: kite@demo.placard.app</p>
        </div>
      </div>
    </div>
  );
}
