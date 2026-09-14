import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import { db } from "./index";

let migrated: Promise<void> | null = null;

/**
 * Applies pending migrations from ./drizzle. Safe to call many times; runs once per process.
 */
export function runMigrations(): Promise<void> {
  if (!migrated) {
    migrated = migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") }).catch((err) => {
      migrated = null;
      throw err;
    });
  }
  return migrated;
}
