import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/server";

/** Better Auth endpoints. 404s when auth isn't configured (no secret set). */
const notConfigured = () => new Response("Auth not configured", { status: 404 });
const handlers = auth ? toNextJsHandler(auth.handler) : null;

export const GET = handlers?.GET ?? notConfigured;
export const POST = handlers?.POST ?? notConfigured;
