"use client";

import { createAuthClient } from "better-auth/react";

/** Browser auth client — same-origin; used by the sign-in/up forms + sign-out. */
export const authClient = createAuthClient();
export const { signIn, signUp, signOut, useSession } = authClient;
