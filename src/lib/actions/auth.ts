"use server";

import { eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, USER_ROLES } from "@/lib/db/schema";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { fieldString, type ActionState } from "./types";

const signupSchema = z.object({
  name: z.string().min(2, "Tell us your name.").max(80),
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters."),
  role: z.enum(USER_ROLES),
  companyName: z.string().max(120).optional(),
});

function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function slugifyHandle(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return base || "user";
}

export async function signup(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: fieldString(form, "name"),
    email: fieldString(form, "email").toLowerCase(),
    password: fieldString(form, "password"),
    role: fieldString(form, "role"),
    companyName: fieldString(form, "companyName") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const data = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
  if (existing) return { error: "An account with that email already exists. Sign in instead." };

  let handle = slugifyHandle(data.name);
  const clash = await db.query.users.findFirst({ where: or(eq(users.handle, handle)) });
  if (clash) handle = `${handle}-${nanoid(4).toLowerCase()}`;

  const id = nanoid(12);
  await db.insert(users).values({
    id,
    email: data.email,
    passwordHash: await hashPassword(data.password),
    name: data.name,
    handle,
    role: data.role,
    companyName: data.role === "brand" ? data.companyName ?? null : null,
  });
  await createSession(id);
  redirect(safeNext(fieldString(form, "next")));
}

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = fieldString(form, "email").toLowerCase();
  const password = fieldString(form, "password");
  if (!email || !password) return { error: "Enter your email and password." };

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "That email and password don't match." };
  }
  await createSession(user.id);
  redirect(safeNext(fieldString(form, "next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
