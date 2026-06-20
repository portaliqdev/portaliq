/**
 * Phase 3 — batch AI evaluation with Gemini Flash.
 *
 * For each enriched portal player: build a compact scouting context (measurables
 * + season production + recruiting profile) → Gemini 2.5 Flash returns a
 * structured evaluation → Zod-validate → write an ai_insights row and stamp the
 * player's fitScore / consensusTier / aiInsightId.
 *
 * Precomputed & stored — the app reads these rows, it never calls the LLM on
 * page load. Scope/limit is configurable so you can prove the pipeline cheaply
 * then scale up.
 *
 *   npm run ai:evaluate                 # default EVAL_LIMIT players
 *   EVAL_LIMIT=500 npm run ai:evaluate  # widen
 */
import { GoogleGenAI } from "@google/genai";
import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { players as playersTbl, playerStats as playerStatsTbl, aiInsights as aiInsightsTbl } from "@/db/schema";
import { AIInsightSchema } from "@/types/ai";
import { ORG_ID } from "@/lib/constants";

const MODEL = "gemini-2.5-flash";
const LIMIT = Number(process.env.EVAL_LIMIT ?? 120);
const CONCURRENCY = 6;
const EVALUATING_PROGRAM = "Maryland (Big Ten)";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/** Strict output contract Gemini must return (validated before storage). */
const EvalOutput = z.object({
  headline: z.string(),
  summary: z.string(),
  fitScore: z.number().min(0).max(100),
  projection: z.enum(["CHAMPION", "STARTER", "CONTRIBUTOR", "DEVELOPMENTAL", "DO_NOT_RECRUIT"]),
  schemeFit: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  comparablePlayers: z.array(z.string()),
  bottomLine: z.string(),
  confidence: z.enum(["LOW", "MED", "HIGH"]),
});
type EvalOutput = z.infer<typeof EvalOutput>;

const PROMPT_SCHEMA = `{
  "headline": string (<=80 chars),
  "summary": string (2-3 sentences),
  "fitScore": number 0-100 (fit for ${EVALUATING_PROGRAM}),
  "projection": one of "CHAMPION" | "STARTER" | "CONTRIBUTOR" | "DEVELOPMENTAL" | "DO_NOT_RECRUIT",
  "schemeFit": string (1 sentence),
  "strengths": string[] (2-4),
  "concerns": string[] (1-3),
  "comparablePlayers": string[] (1-3 current/recent CFB or NFL names),
  "bottomLine": string (1 sentence recommendation),
  "confidence": "LOW" | "MED" | "HIGH"
}`;

interface Ctx {
  id: string;
  fullName: string;
  primaryPosition: string;
  stars: number;
  compositeRating: number;
  heightInches: number;
  weightLbs: number;
  eligibilityClass: string;
  portalStatus: string | null;
  origin: string;
  destination?: string;
  metrics?: Record<string, number>;
}

function buildPrompt(c: Ctx): string {
  const ht = c.heightInches ? `${Math.floor(c.heightInches / 12)}'${c.heightInches % 12}"` : "n/a";
  const stat = c.metrics
    ? Object.entries(c.metrics)
        .slice(0, 14)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")
    : "none";
  return `You are a college football personnel evaluator for ${EVALUATING_PROGRAM}. Assess this transfer-portal player as a potential acquisition. Be concise, specific, and honest. Return ONLY JSON matching this shape, no markdown:
${PROMPT_SCHEMA}

PLAYER
name: ${c.fullName}
position: ${c.primaryPosition}
recruiting: ${c.stars}-star, composite ${c.compositeRating}
measurables: ${ht}, ${c.weightLbs || "n/a"} lbs
class/eligibility: ${c.eligibilityClass}
portal status: ${c.portalStatus ?? "unknown"}
from: ${c.origin}${c.destination ? `\ncommitted to: ${c.destination}` : ""}
2025 production: ${stat}`;
}

async function evaluateOne(c: Ctx): Promise<EvalOutput | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: buildPrompt(c),
        config: { responseMimeType: "application/json", temperature: 0.4 },
      });
      const json = JSON.parse(res.text ?? "{}");
      const parsed = EvalOutput.safeParse(json);
      if (parsed.success) return parsed.data;
      return null;
    } catch (err) {
      const msg = (err as Error).message;
      // Retry transient errors (rate limits, 5xx, fetch hiccups); never let a
      // single failed call crash the batch — just give up on this player.
      if (attempt < 2 && (msg.includes("429") || msg.includes("500") || msg.includes("503") || msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("fetch"))) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function runPool<T>(items: T[], worker: (item: T, i: number) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) {
        const idx = i++;
        await worker(items[idx], idx);
      }
    }),
  );
}

async function main() {
  // Target: enriched, still-available (portal/committed) players without an
  // insight yet — highest-rated first so a capped run covers the best talent.
  const rows = await db
    .select()
    .from(playersTbl)
    .where(
      and(
        gt(playersTbl.heightInches, 0),
        or(eq(playersTbl.portalStatus, "IN_PORTAL"), eq(playersTbl.portalStatus, "COMMITTED")),
        isNull(playersTbl.aiInsightId),
      ),
    )
    .orderBy(desc(playersTbl.fitScore))
    .limit(LIMIT);

  console.log(`→ Evaluating ${rows.length} players with ${MODEL} (concurrency ${CONCURRENCY})…`);

  // Pull their season stats in one shot for context.
  const ids = rows.map((r) => r.id);
  const statRows = ids.length
    ? await db.select().from(playerStatsTbl).where(inArray(playerStatsTbl.playerId, ids))
    : [];
  const statByPlayer = new Map(statRows.map((s) => [s.playerId, s.metrics]));

  const now = new Date().toISOString();
  let ok = 0;
  let failed = 0;

  await runPool(rows, async (p, i) => {
    const ctx: Ctx = {
      id: p.id,
      fullName: p.fullName,
      primaryPosition: p.primaryPosition,
      stars: p.stars,
      compositeRating: p.compositeRating,
      heightInches: p.heightInches,
      weightLbs: p.weightLbs,
      eligibilityClass: p.eligibilityClass,
      portalStatus: p.portalStatus,
      origin: (p.currentSchool as { name: string }).name,
      metrics: statByPlayer.get(p.id) ?? undefined,
    };

    const out = await evaluateOne(ctx);
    if (!out) {
      failed++;
      return;
    }

    const insightId = `ai_${p.id}`;
    const insight = AIInsightSchema.parse({
      id: insightId,
      orgId: ORG_ID,
      playerId: p.id,
      type: "FIT_ANALYSIS",
      model: MODEL,
      headline: out.headline,
      summary: out.summary,
      body: `**Scheme fit:** ${out.schemeFit}\n\n**Bottom line:** ${out.bottomLine}`,
      fitScore: out.fitScore,
      confidence: out.confidence,
      strengths: out.strengths,
      concerns: out.concerns,
      comparablePlayers: out.comparablePlayers,
      sourceRefs: [],
      generatedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(aiInsightsTbl).values(insight).onConflictDoUpdate({
      target: aiInsightsTbl.id,
      set: { ...insight, id: undefined },
    });
    // Only link the insight — the headline fitScore/tier come from the
    // deterministic `npm run score` pass so every player is on one scale.
    await db
      .update(playersTbl)
      .set({ aiInsightId: insightId, updatedAt: now })
      .where(eq(playersTbl.id, p.id));

    ok++;
    if ((i + 1) % 20 === 0) console.log(`  …${i + 1}/${rows.length}`);
  });

  console.log(`\n✓ Evaluation complete — ${ok} insights written, ${failed} failed.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
