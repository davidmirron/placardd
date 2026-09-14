"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/file-uploader";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { UserAvatar } from "@/components/user-avatar";
import { updateProfile } from "@/lib/actions/profile";

type Props = {
  user: {
    name: string;
    handle: string;
    role: "creator" | "brand";
    bio: string | null;
    location: string | null;
    website: string | null;
    socialHandle: string | null;
    followers: number;
    companyName: string | null;
    avatarUrl: string | null;
    email: string;
  };
};

export function SettingsForm({ user }: Props) {
  const [state, action] = useActionState(updateProfile, undefined);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="avatarUrl" value={avatarUrl} />
      <div className="flex items-center gap-4">
        <UserAvatar name={user.name} avatarUrl={avatarUrl || null} className="size-16" />
        <FileUploader folder="avatars" variant="button" label="Change photo" onUploaded={(f) => setAvatarUrl(f.url)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={user.name} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="handle">Handle</Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">@</span>
            <Input id="handle" name="handle" defaultValue={user.handle} required pattern="[a-z0-9-]{3,30}" className="pl-7" />
          </div>
        </div>
        {user.role === "brand" && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="companyName">Company or brand name</Label>
            <Input id="companyName" name="companyName" defaultValue={user.companyName ?? ""} />
          </div>
        )}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" name="bio" rows={3} defaultValue={user.bio ?? ""} placeholder={user.role === "brand" ? "What you sell and who you want to reach." : "Who you are, where you show up, what your audience looks like."} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={user.location ?? ""} placeholder="City, Country" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" type="url" defaultValue={user.website ?? ""} placeholder="https://" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="socialHandle">Main social handle</Label>
          <Input id="socialHandle" name="socialHandle" defaultValue={user.socialHandle ?? ""} placeholder="yourhandle" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="followers">Followers</Label>
          <Input id="followers" name="followers" type="number" min={0} defaultValue={user.followers} />
          <p className="text-xs text-muted-foreground">Self-reported for now. Verified counts are coming.</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Signed in as {user.email}. Account type: {user.role === "brand" ? "Brand" : "Creator"}.</p>

      <div className="flex items-center gap-3">
        <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
