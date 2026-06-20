/**
 * Apply generated Drizzle migrations to Neon. Non-interactive (no TTY prompt),
 * so it works in CI and from this harness. Uses the DIRECT (unpooled) url.
 *
 *   node --env-file=.env.local --import tsx scripts/migrate.ts
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL(_UNPOOLED) is not set — add it to .env.local");

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ migrations applied");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
