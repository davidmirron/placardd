/**
 * Wipes the local SQLite database and re-seeds demo data.
 * Usage: pnpm db:reset
 */
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "file:./data/placard.db";
if (!url.startsWith("file:")) {
  console.error("db:reset only supports local file databases.");
  process.exit(1);
}
const file = path.resolve(url.slice("file:".length));
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  fs.rmSync(file + suffix, { force: true });
}

const { runMigrations } = await import("../src/lib/db/migrate");
const { seed } = await import("../src/lib/db/seed");
await runMigrations();
await seed();
console.log(`Fresh database with demo data written to ${file}`);
process.exit(0);
