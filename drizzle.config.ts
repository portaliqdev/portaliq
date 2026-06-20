import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config — schema generation & migration.
 *
 * Uses the DIRECT (unpooled) connection: DDL and long migrations don't play
 * well through Neon's transaction pooler. Falls back to the pooled url if the
 * unpooled one isn't set.
 *
 * schemaFilter is pinned to "public" so Drizzle never tries to manage the
 * `neon_auth` schema if Neon Auth is enabled.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
