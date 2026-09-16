export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("./lib/db/migrate");
    await runMigrations();
    if (shouldSeedDemoData()) {
      const { seedIfEmpty } = await import("./lib/db/seed");
      await seedIfEmpty();
    }
  }
}

/**
 * Demo data ships with well-known passwords, so it is opt-out locally but opt-in in production:
 * a real launch database must never quietly contain accounts anyone on the internet can log into.
 */
function shouldSeedDemoData() {
  const flag = process.env.SEED_DEMO_DATA;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}
