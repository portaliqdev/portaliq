import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/client";
import * as authSchema from "@/db/auth-schema";

/**
 * Better Auth (self-hosted) — gates the app behind email/password login with
 * user/session tables in Neon. Same engine as Neon Auth, but runs on Next 14
 * (Neon's managed SDK requires Next 16).
 *
 * GUARDED: only constructed when BETTER_AUTH_SECRET is set, so the app stays
 * open/usable until you configure auth, then the gate activates.
 *
 * Required env:
 *   BETTER_AUTH_SECRET   (32+ char random string)
 *   BETTER_AUTH_URL      (base URL, e.g. http://localhost:3200 or the Vercel URL)
 */
export const authEnabled = Boolean(process.env.BETTER_AUTH_SECRET);

export const auth = authEnabled
  ? betterAuth({
      database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
      emailAndPassword: { enabled: true, disableSignUp: true },
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: process.env.BETTER_AUTH_URL,
    })
  : null;
