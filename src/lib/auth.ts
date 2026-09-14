import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type User, type UserRole } from "@/lib/db/schema";

const COOKIE_NAME = "placard_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  const raw = process.env.AUTH_SECRET ?? "placard-dev-secret-change-me-before-going-live";
  return new TextEncoder().encode(raw);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

async function readSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Current user for this request, or null. Memoised per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const userId = await readSessionUserId();
  if (!userId) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return user ?? null;
});

export async function requireUser(next?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export async function requireRole(role: UserRole, next?: string): Promise<User> {
  const user = await requireUser(next);
  if (user.role !== role) redirect("/dashboard?wrong_role=1");
  return user;
}

export type PublicUser = Pick<
  User,
  "id" | "name" | "handle" | "role" | "avatarUrl" | "bio" | "location" | "website" | "socialHandle" | "followers" | "companyName" | "createdAt"
>;

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    name: u.name,
    handle: u.handle,
    role: u.role,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    location: u.location,
    website: u.website,
    socialHandle: u.socialHandle,
    followers: u.followers,
    companyName: u.companyName,
    createdAt: u.createdAt,
  };
}
