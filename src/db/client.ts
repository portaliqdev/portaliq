/**
 * Postgres (Neon) connection — the runtime DB handle for the future
 * `postgres` data backend. Uses the POOLED DATABASE_URL: serverless route
 * handlers open many short-lived connections, which Neon's pooler absorbs.
 * Migrations and bulk ingestion use the DIRECT url instead (see drizzle.config).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — add it to .env.local");
}

// prepare:false is required for transaction-pooled connections (Neon -pooler).
const queryClient = postgres(connectionString, { prepare: false });

export const db = drizzle(queryClient, { schema });
export type DB = typeof db;
