/**
 * Phase: AI roster-needs evaluation for Maryland.
 *
 *   npm run ai:needs
 *
 * Reads the ingested roster_slots + base team_needs (depth math), summarizes
 * each position room's 2025 production / returning starters / departures, and
 * asks Gemini to assign needScore + priority + a grounded rationale. Writes
 * those back to team_needs — which the app's analyzeTeamNeeds() then surfaces
 * on the Team Needs page (headline/summary derive from these rows).
 */
import { GoogleGenAI } from "@google/genai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { teamNeeds as needsTbl, rosterSlots as slotsTbl } from "@/db/schema";
import { ORG_ID } from "@/lib/constants";

const MODEL = "gemini-2.5-flash";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const Assessment = z.object({
  position: z.string(),
  needScore: z.number().min(0).max(100),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"]),
  notes: z.string(),
});
const Output = z.object({ assessments: z.array(Assessment) });

async function main() {
  const needs = await db.select().from(needsTbl).where(eq(needsTbl.orgId, ORG_ID));
  const slots = await db.select().from(slotsTbl).where(eq(slotsTbl.orgId, ORG_ID));

  // Per-position summary for the prompt.
  const byPos = new Map<string, typeof slots>();
  for (const s of slots) {
    if (!byPos.has(s.position)) byPos.set(s.position, []);
    byPos.get(s.position)!.push(s);
  }

  const roomLines = needs.map((n) => {
    const room = (byPos.get(n.position) ?? []).slice().sort((a, b) => a.depthRank - b.depthRank);
    const returning = room.filter((s) => s.departureRisk !== "HIGH");
    const departing = room.filter((s) => s.departureRisk === "HIGH").map((s) => s.playerName);
    const topReturning = returning
      .filter((s) => s.projectedGrade != null)
      .sort((a, b) => (b.projectedGrade ?? 0) - (a.projectedGrade ?? 0))
      .slice(0, 3)
      .map((s) => `${s.playerName} (${s.eligibilityClass}, grade ${s.projectedGrade})`);
    return [
      `POSITION ${n.position} (${n.positionGroup})`,
      `  ideal depth ${n.idealDepth}, current ${n.currentDepth}, projected returning ${n.projectedReturning}, departures ${n.projectedDepartures}`,
      `  starter returning: ${n.starterReturning ? "yes" : "no"}`,
      `  top returning production: ${topReturning.length ? topReturning.join("; ") : "none with meaningful 2025 production"}`,
      `  key departures: ${departing.length ? departing.join(", ") : "none"}`,
    ].join("\n");
  });

  const prompt = `You are the director of player personnel for Maryland football (Big Ten). Evaluate the team's 2026 roster needs based on the 2025 roster, returning production, and confirmed portal/graduation departures below. For EACH position, assign:
- needScore: 0-100 (higher = more urgent need to add talent via the portal/recruiting)
- priority: CRITICAL | HIGH | MEDIUM | LOW | NONE
- notes: one specific sentence justifying the score, grounded in the data (depth, returning starters, production, departures).

Be honest and discriminating — not everything is critical. Return ONLY JSON: { "assessments": [ { "position": string, "needScore": number, "priority": string, "notes": string } ] }

ROSTER SITUATION:
${roomLines.join("\n\n")}`;

  console.log(`→ Evaluating ${needs.length} position rooms with ${MODEL}…`);
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.3 },
  });
  const parsed = Output.safeParse(JSON.parse(res.text ?? "{}"));
  if (!parsed.success) {
    console.error("Bad AI output:", parsed.error.issues.slice(0, 3));
    process.exit(1);
  }

  // Gemini sometimes echoes "CB (DB)" — key by the leading position code only.
  const posCode = (s: string) => (s.match(/^[A-Z]+/)?.[0] ?? s).trim();
  const byPosAssess = new Map(parsed.data.assessments.map((a) => [posCode(a.position), a]));
  const now = new Date().toISOString();
  let updated = 0;
  for (const n of needs) {
    const a = byPosAssess.get(posCode(n.position));
    if (!a) continue;
    await db
      .update(needsTbl)
      .set({ needScore: a.needScore, priority: a.priority, notes: a.notes, computedAt: now, updatedAt: now })
      .where(eq(needsTbl.id, n.id));
    updated++;
  }

  console.log(`\n✓ AI needs evaluation complete — ${updated} rooms scored.`);
  for (const a of [...byPosAssess.values()].sort((x, y) => y.needScore - x.needScore)) {
    console.log(`  ${a.position.padEnd(4)} ${String(a.needScore).padStart(3)} ${a.priority.padEnd(8)} ${a.notes}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
