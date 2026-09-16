"use client";

import { useActionState, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const avatarDirty = avatarUrl !== (user.avatarUrl ?? "");

  const uploadAvatar = async (file: File) => {
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("folder", "avatars");
      form.set("kind", "image");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed.");
      setAvatarUrl(data.url);
    } catch (err) {
      setAvatarError((err as Error).message);
    } finally {
      setAvatarBusy(false);
      if (avatarInput.current) avatarInput.current.value = "";
    }
  };

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="avatarUrl" value={avatarUrl} />
      <div className="flex items-center gap-5">
        <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} disabled={avatarBusy} />
        <button
          type="button"
          onClick={() => avatarInput.current?.click()}
          disabled={avatarBusy}
          className="group relative rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={avatarUrl ? "Change profile photo" : "Add profile photo"}
        >
          <UserAvatar name={user.name} avatarUrl={avatarUrl || null} className="size-20 text-lg" />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {avatarBusy ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
          </span>
          <span className="absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full border-2 border-background bg-foreground text-background shadow-sm group-hover:opacity-0">
            {avatarBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
          </span>
        </button>
        <div className="space-y-1">
          <p className="text-sm font-medium">{avatarUrl ? "Profile photo" : "Add a profile photo"}</p>
          <p className="text-xs text-muted-foreground">
            {user.role === "brand" ? "Your logo works best. " : "A clear photo of you — brands are buying a person, not a placeholder. "}
            JPG, PNG or WEBP. Click the circle to {avatarUrl ? "change it" : "upload"}.
          </p>
          {avatarDirty && !avatarBusy && <p className="text-xs text-emerald-700 dark:text-emerald-400">New photo ready — hit Save profile to keep it.</p>}
          {avatarError && <p className="text-xs text-destructive">{avatarError}</p>}
        </div>
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
