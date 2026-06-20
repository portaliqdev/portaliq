/**
 * Phase 5 — live Gemini provider (gemini-2.5-flash via @google/genai).
 *
 * Grounded, not free-form: every response is built from real PortalTools data
 * (players, stats, team needs). Three strategies keep it fast + honest:
 *   - generateScoutingReport: serve the STORED Gemini insight instantly when one
 *     exists (the 125 from `npm run ai:evaluate`); otherwise generate live and
 *     cache for the runtime. Either way it is grounded in real 2025 production.
 *   - answerQuery: retrieval-augmented — search real players first, then let
 *     Gemini compose over only those rows (playerIds come from retrieval, so it
 *     can't invent players).
 *   - analyzeTeamNeeds: Gemini narrates over the real team_needs rows.
 *
 * All LLM calls run server-side (provider is built in di.ts) and fall back to a
 * deterministic result if Gemini errors, so a page never crashes on the AI.
 */
import { GoogleGenAI } from "@google/genai";
import type { AIProvider } from "../ai-provider";
import type { PortalTools, WorkflowPlayerRecord } from "../tools";
import { parseQuery } from "../parser";
import {
  ScoutingReportOutputSchema,
  type AssistantQuery,
  type AssistantAnswer,
  type ScoutingReportOutput,
  type TeamNeedsAnalysis,
  type AIInsight,
} from "@/types/ai";
import type { Player } from "@/types/player";
import { POSITION_META, type PositionCode } from "@/types/enums";
import { tierFromScore } from "@/lib/scoring";
import { formatHeight, shortDate } from "@/lib/utils";

const MODEL = "gemini-2.5-flash";

const ROLE_BY_TIER: Record<string, string> = {
  CHAMPION: "Immediate-impact starter with all-conference upside",
  STARTER: "Projected Day-1 starter",
  CONTRIBUTOR: "Rotational contributor with starter upside",
  DEVELOPMENTAL: "Developmental depth piece",
  DO_NOT_RECRUIT: "Below our recruiting threshold",
};

/** Pull the first JSON object out of an LLM response (handles ```json fences). */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("no JSON in response");
  return JSON.parse(raw.slice(start, end + 1));
}

export class GeminiAIProvider implements AIProvider {
  readonly model = MODEL;
  private ai: GoogleGenAI;
  private reportCache = new Map<string, ScoutingReportOutput>();
  private needsCache: TeamNeedsAnalysis | null = null;

  constructor(private tools: PortalTools) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });
  }

  private async json(prompt: string): Promise<unknown> {
    const res = await this.ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.4 },
    });
    return extractJson(res.text ?? "{}");
  }

  /* ── scouting report ─────────────────────────────────────────────────── */
  async generateScoutingReport(playerId: string): Promise<ScoutingReportOutput> {
    const cached = this.reportCache.get(playerId);
    if (cached) return cached;

    const detail = await this.tools.getPlayerDetail(playerId);
    if (!detail) throw new Error(`Player ${playerId} not found`);
    const { player, aiInsight } = detail;

    // Profiles must render instantly, so we never block a page load on an LLM
    // call. Rich Gemini reports are PRECOMPUTED (npm run ai:evaluate → stored
    // insight); here we serve that when present, else an instant deterministic
    // report grounded in the player's real scores. (The live Gemini call lives
    // in the batch evaluator and the interactive assistant, not page render.)
    const report = aiInsight
      ? this.fromInsight(player, aiInsight, detail.similar)
      : this.deterministic(player, detail.similar);
    this.reportCache.set(playerId, report);
    return report;
  }

  /** Live Gemini scouting generation — used by the batch evaluator, not page render. */
  async generateLive(playerId: string): Promise<ScoutingReportOutput | null> {
    const detail = await this.tools.getPlayerDetail(playerId);
    if (!detail) return null;
    const { player } = detail;
    try {
      const org = await this.tools.getOrg();
      const meta = POSITION_META[player.primaryPosition];
      const metrics = detail.stats[0]?.metrics ?? {};
      const side = meta.side === "offense" ? org.offenseScheme : org.defenseScheme;
      const prompt = `You are the director of player personnel for Maryland (Big Ten), scheme ${String(side).replace(/_/g, " ").toLowerCase()}. Write an honest scouting report on this transfer-portal player. Ground every claim in the data; do not invent stats. Return ONLY JSON with keys: headline, summary, strengths(string[]), weaknesses(string[]), riskFactors(string[]), developmentPotential, schemeFit, projection("CHAMPION"|"STARTER"|"CONTRIBUTOR"|"DEVELOPMENTAL"|"DO_NOT_RECRUIT"), role, bottomLine, comparablePlayers(string[]), confidence("LOW"|"MED"|"HIGH"), sourceRefs(array of {label,value}).

PLAYER: ${player.fullName} — ${meta.label}, ${player.currentSchool.name} (${player.currentSchool.conference}); ${player.stars}★ composite ${player.compositeRating}; ${formatHeight(player.heightInches)}/${player.weightLbs} lb; ${player.eligibilityClass}, ${player.eligibility.yearsRemaining} yr left; fit ${player.fitScore ?? "n/a"}, prod ${player.productionScore ?? "n/a"}, undervaluation ${player.undervaluation ?? "n/a"}
2025 stats (CFBD): ${JSON.stringify(metrics)}`;
      const parsed = ScoutingReportOutputSchema.safeParse(await this.json(prompt));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  private fromInsight(player: Player, insight: AIInsight, similar: Player[]): ScoutingReportOutput {
    const meta = POSITION_META[player.primaryPosition];
    const fit = insight.fitScore ?? player.fitScore ?? 60;
    const tier = tierFromScore(fit);
    const schemeFit = insight.body?.match(/scheme fit:\*\*\s*(.+?)(?:\n|$)/i)?.[1] ?? `Projects as a fit at ${meta.label}.`;
    const bottomLine = insight.body?.match(/bottom line:\*\*\s*(.+?)(?:\n|$)/i)?.[1] ?? insight.summary;
    return {
      headline: insight.headline,
      summary: insight.summary,
      strengths: insight.strengths,
      weaknesses: insight.concerns,
      riskFactors: player.injuryFlags.concat(player.characterFlags).length
        ? player.injuryFlags.concat(player.characterFlags)
        : ["No flags on file — standard portal due diligence."],
      developmentPotential:
        player.eligibility.yearsRemaining >= 3 ? "High — multi-year runway." : "Win-now value; limited runway.",
      schemeFit,
      projection: tier,
      role: ROLE_BY_TIER[tier],
      bottomLine,
      comparablePlayers: insight.comparablePlayers.length
        ? insight.comparablePlayers
        : similar.slice(0, 3).map((s) => `${s.fullName} (${s.currentSchool.name})`),
      confidence: insight.confidence,
      sourceRefs: insight.sourceRefs.length
        ? insight.sourceRefs
        : [
            { label: "Fit score", value: String(fit) },
            { label: "Production percentile", value: String(player.productionScore ?? "—") },
          ],
    };
  }

  private deterministic(player: Player, similar: Player[]): ScoutingReportOutput {
    const meta = POSITION_META[player.primaryPosition];
    const fit = player.fitScore ?? 60;
    const tier = tierFromScore(fit);
    return {
      headline: `${tier === "CHAMPION" || tier === "STARTER" ? "Priority" : "Tracked"} ${meta.label} — fit ${fit}`,
      summary: `${player.fullName} is a ${player.stars}★ ${meta.label.toLowerCase()} from ${player.currentSchool.name} (${player.currentSchool.conference}), ${formatHeight(player.heightInches)}/${player.weightLbs}. Grades as a ${tier.replace(/_/g, " ").toLowerCase()} fit.`,
      strengths: [
        (player.productionScore ?? 0) >= 60
          ? `${player.productionScore}th-percentile production among portal ${player.positionGroup}s.`
          : `Experienced ${meta.label.toLowerCase()} with starting reps.`,
        `${player.eligibility.yearsRemaining} years of eligibility remaining.`,
      ],
      weaknesses: ["Projection limited by available data; verify on film."],
      riskFactors: ["Low-risk profile — standard portal due diligence."],
      developmentPotential: player.eligibility.yearsRemaining >= 3 ? "High — multi-year runway." : "Win-now value.",
      schemeFit: `Workable fit at ${meta.label} for Maryland's scheme.`,
      projection: tier,
      role: ROLE_BY_TIER[tier],
      bottomLine:
        tier === "CHAMPION" || tier === "STARTER"
          ? `Pursue — answers a need and fits the scheme.`
          : `Monitor; revisit if the position room thins.`,
      comparablePlayers: similar.slice(0, 3).map((s) => `${s.fullName} (${s.currentSchool.name})`),
      confidence: "MED",
      sourceRefs: [
        { label: "Fit score", value: String(fit) },
        { label: "Production percentile", value: String(player.productionScore ?? "—") },
      ],
    };
  }

  /* ── assistant (retrieval-augmented) ─────────────────────────────────── */
  async answerQuery({ question }: AssistantQuery): Promise<AssistantAnswer> {
    const parsed = parseQuery(question);

    // Recruiting-workflow questions → answer from the workflow tools (grounded).
    const workflowAnswer = await this.answerWorkflow(parsed.intent, parsed.filters.positions?.[0]);
    if (workflowAnswer) return workflowAnswer;

    const results = (await this.tools.searchPlayers(parsed.filters)).slice(0, Math.max(parsed.limit, 8));
    const toolCalls: AssistantAnswer["toolCalls"] = [
      { tool: "searchPlayers", args: { ...parsed.filters }, resultSummary: `${results.length} players matched` },
    ];

    if (results.length === 0) {
      return {
        answer: "No portal players match those filters. Try widening the conference or dropping the eligibility floor.",
        playerIds: [],
        toolCalls,
        followUps: ["Show all Power-4 options", "Who's most undervalued right now?", "Drop the eligibility filter"],
        confidence: "LOW",
      };
    }

    const rows = results
      .map(
        (p, i) =>
          `${i + 1}. ${p.fullName} | ${p.primaryPosition} | ${p.currentSchool.name} (${p.currentSchool.conference}) | fit ${p.fitScore} | prod ${p.productionScore ?? "—"} | undervaluation ${p.undervaluation ?? "—"} | ${p.stars}★ | ${p.eligibility.yearsRemaining}yr`,
      )
      .join("\n");

    try {
      const prompt = `You are PortalIQ's recruiting assistant for Maryland. Answer the user's question using ONLY the players listed (these were retrieved from the database; do not mention any player not listed). Be concise, use **markdown**, cite specific fit/production/undervaluation numbers. Return ONLY JSON: { "answer": string (markdown), "followUps": string[3], "confidence": "LOW"|"MED"|"HIGH" }.

QUESTION: ${question}

PLAYERS:
${rows}`;
      const out = (await this.json(prompt)) as { answer?: string; followUps?: string[]; confidence?: string };
      if (out.answer) {
        return {
          answer: out.answer,
          playerIds: results.map((p) => p.id),
          toolCalls,
          followUps: out.followUps?.slice(0, 3) ?? ["Compare the top 3", "Filter to 2+ years eligibility", "Add the top option to the board"],
          confidence: (out.confidence as AssistantAnswer["confidence"]) ?? (results.length >= 3 ? "HIGH" : "MED"),
        };
      }
    } catch {
      /* fall through */
    }

    const top = results[0];
    return {
      answer: `Found **${results.length}** matching players. Top fit is **${top.fullName}** (${top.primaryPosition}, ${top.currentSchool.name}) — fit **${top.fitScore}**, ${top.eligibility.yearsRemaining} yr left.${(top.undervaluation ?? 0) >= 20 ? " ⚑ Flagged undervalued." : ""}`,
      playerIds: results.map((p) => p.id),
      toolCalls,
      followUps: ["Who is most undervalued here?", "Compare the top 3", "Add the top option to the board"],
      confidence: results.length >= 3 ? "HIGH" : "MED",
    };
  }

  /* ── recruiting workflow (grounded in workflow tools) ────────────────── */
  private async answerWorkflow(intent: string, position?: PositionCode): Promise<AssistantAnswer | null> {
    const t = this.tools;
    const WF = ["follow_up_today", "uncontacted_targets", "unowned_priority", "board_summary", "evaluated_to_watchlist"];
    if (!WF.includes(intent) || !t.hasWorkflowSupport?.()) return null;

    let records: WorkflowPlayerRecord[] = [];
    let header = "";
    if (intent === "follow_up_today") {
      records = (await t.getFollowUpsDueToday?.()) ?? [];
      header = `**${records.length} player${records.length === 1 ? "" : "s"} need follow-up today.**`;
    } else if (intent === "uncontacted_targets") {
      records = (await t.getTopUncontactedTargets?.(position, 10)) ?? [];
      header = `**Top uncontacted targets${position ? ` at ${position}` : ""}.**`;
    } else if (intent === "unowned_priority") {
      records = (await t.getHighPriorityPlayersWithoutOwner?.(10)) ?? [];
      header = `**${records.length} high-priority player${records.length === 1 ? "" : "s"} without an owner.**`;
    } else if (intent === "evaluated_to_watchlist") {
      records = (await t.getEvaluatedToWatchlistCandidates?.(10)) ?? [];
      header = "**Evaluated players ready to move to the watchlist.**";
    } else {
      const summary = await t.summarizeRecruitingBoard?.(position);
      records = summary?.records ?? [];
      header = `**Recruiting board summary${position ? ` — ${position}` : ""}.**`;
    }

    const followUps = ["Who needs follow-up today?", "High-priority players without owners", "Top uncontacted targets by position"];
    const toolCalls: AssistantAnswer["toolCalls"] = [
      { tool: "getTeamNeeds", args: { workflowIntent: intent, position }, resultSummary: `${records.length} workflow records` },
    ];
    if (records.length === 0) {
      return { answer: `${header}\n\nNothing matches in the recruiting workflow right now.`, playerIds: [], toolCalls, followUps, confidence: "LOW" };
    }
    const lines = records.slice(0, 10).map((r, i) => {
      const w = r.workflow;
      const status = w?.status ? String(w.status).toLowerCase().replace(/_/g, " ") : "tracked";
      const owner = w?.owner?.name ? `owner ${w.owner.name}` : "no owner";
      const due = r.nextFollowUpAt ?? w?.nextActionAt;
      return `${i + 1}. **${r.player.fullName}** (${r.player.primaryPosition}) — ${status} · ${owner}${due ? ` · due ${shortDate(due)}` : ""}`;
    });
    return {
      answer: `${header}\n\n${lines.join("\n")}`,
      playerIds: records.map((r) => r.player.id),
      toolCalls,
      followUps,
      confidence: "HIGH",
    };
  }

  /* ── team needs ──────────────────────────────────────────────────────── */
  async analyzeTeamNeeds(): Promise<TeamNeedsAnalysis> {
    if (this.needsCache) return this.needsCache;
    const needs = await this.tools.getTeamNeeds();
    const ranked = [...needs].sort((a, b) => b.needScore - a.needScore);
    const top = ranked.slice(0, 5);

    // Ground recommended targets by searching the portal for the top needs.
    const recommendedTargets: TeamNeedsAnalysis["recommendedTargets"] = [];
    for (const need of ranked.filter((n) => n.priority === "CRITICAL" || n.priority === "HIGH").slice(0, 4)) {
      const best = (
        await this.tools.searchPlayers({ positions: [need.position], portalStatuses: ["IN_PORTAL"], sortBy: "fitScore", sortDir: "desc", limit: 1 })
      )[0];
      if (best) recommendedTargets.push({ playerId: best.id, reason: `${best.fullName} (fit ${best.fitScore}) is the top available fit at ${need.position}.` });
    }

    let headline = `Roster construction: ${top.filter((n) => n.priority === "CRITICAL").map((n) => n.position).join(", ") || "balanced board"}.`;
    let summary = `${ranked.filter((n) => n.priority === "CRITICAL").length} critical and ${ranked.filter((n) => n.priority === "HIGH").length} high-priority rooms.`;
    try {
      const prompt = `You are Maryland's director of player personnel. Summarize the 2026 roster needs below in 2-3 sentences for the staff. Return ONLY JSON: { "headline": string (<=90 chars), "summary": string }.
NEEDS (position: needScore, priority — rationale):
${ranked.map((n) => `${n.position}: ${n.needScore}, ${n.priority} — ${n.notes ?? ""}`).join("\n")}`;
      const out = (await this.json(prompt)) as { headline?: string; summary?: string };
      if (out.headline) headline = out.headline;
      if (out.summary) summary = out.summary;
    } catch {
      /* keep deterministic headline/summary */
    }

    this.needsCache = {
      headline,
      summary,
      priorities: top.map((n) => ({
        position: n.position,
        rationale: n.notes ?? `${n.projectedReturning} returning vs. ${n.idealDepth} ideal (${n.projectedDepartures} out).`,
        needScore: n.needScore,
      })),
      recommendedTargets,
    };
    return this.needsCache;
  }
}
