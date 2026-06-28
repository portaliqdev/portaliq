import { NextResponse } from "next/server";
import { getServices } from "@/lib/di";

export const dynamic = "force-dynamic";

/**
 * Lightweight player search for the global ⌘K command palette. Read-only wiring over
 * the existing SearchService — returns a slim projection for fast, type-ahead results.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ players: [] });

  const services = getServices();
  const players = await services.search.searchPortal({
    q,
    sortBy: "fitScore",
    sortDir: "desc",
  });
  const results = players.slice(0, 8).map((p) => ({
    id: p.id,
    name: p.fullName,
    position: p.primaryPosition,
    school: p.currentSchool.name,
    fitScore: p.fitScore ?? null,
  }));
  return NextResponse.json({ players: results });
}
