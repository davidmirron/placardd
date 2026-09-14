import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export const DATABASE_URL = process.env.DATABASE_URL ?? "file:./data/placard.db";

function ensureLocalDir(url: string) {
  if (!url.startsWith("file:")) return;
  const filePath = url.slice("file:".length);
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

const globalForDb = globalThis as unknown as { __placardClient?: Client };

function getClient(): Client {
  if (!globalForDb.__placardClient) {
    ensureLocalDir(DATABASE_URL);
    globalForDb.__placardClient = createClient({
      url: DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
  }
  return globalForDb.__placardClient;
}

export const db = drizzle(getClient(), { schema });
export type Db = typeof db;
export { schema };
