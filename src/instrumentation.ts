export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("./lib/db/migrate");
    await runMigrations();
    if (process.env.SEED_DEMO_DATA !== "false") {
      const { seedIfEmpty } = await import("./lib/db/seed");
      await seedIfEmpty();
    }
  }
}
