import type { Metadata } from "next";
import { SettingsForm } from "./settings-form";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser("/settings");
  return (
    <div className="container-page max-w-2xl space-y-8 py-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Profile settings</h1>
        <p className="text-muted-foreground">This is what brands and creators see when they look you up.</p>
      </div>
      <SettingsForm
        user={{
          name: user.name,
          handle: user.handle,
          role: user.role,
          bio: user.bio,
          location: user.location,
          website: user.website,
          socialHandle: user.socialHandle,
          followers: user.followers,
          companyName: user.companyName,
          avatarUrl: user.avatarUrl,
          email: user.email,
        }}
      />
    </div>
  );
}
