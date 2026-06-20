import type { AIProvider } from "../ai-provider";
import type { PortalTools, WorkflowPlayerRecord } from "../tools";
import { parseQuery } from "../parser";
import type {
  AssistantQuery,
  AssistantAnswer,
  AssistantToolCall,
  ScoutingReportOutput,
  TeamNeedsAnalysis,
} from "@/types/ai";
import type { Player } from "@/types/player";
import type { PlayerStats } from "@/types/stats";
import { POSITION_META } from "@/types/enums";
import { tierFromScore } from "@/lib/scoring";
import { formatHeight } from "@/lib/utils";

function keyStat(p: Player, latest?: PlayerStats): string {
  const m = latest?.metrics ?? {};
  switch (p.positionGroup) {
    case "QB": return `${m.passYards ?? 0} pass yds, ${m.passTD ?? 0} TD / ${m.interceptions ?? 0} INT`;
    case "RB": return `${m.rushYards ?? 0} rush yds, ${m.yardsPerCarry ?? 0} ypc, ${m.rushTD ?? 0} TD`;
    case "WR":
    case "TE": return `${m.receptions ?? 0} rec, ${m.recYards ?? 0} yds, ${m.recTD ?? 0} TD`;
    case "OL": return `${m.passBlockGrade ?? 0} pass-block grade, ${m.pressuresAllowed ?? 0} pressures allowed`;
    case "DL": return `${m.sacks ?? 0} sacks, ${m.tacklesForLoss ?? 0} TFL, ${m.pressures ?? 0} pressures`;
    case "LB": return `${m.tackles ?? 0} tackles, ${m.tacklesForLoss ?? 0} TFL`;
    case "DB": return `${m.passBreakups ?? 0} PBU, ${m.interceptions ?? 0} INT`;
    default: return `${latest?.pffOverall ?? "—"} PFF grade`;
  }
}

const ROLE_BY_TIER: Record<string, string> = {
  CHAMPION: "Immediate-impact starter with all-conference upside",
  STARTER: "Projected Day-1 starter",
  CONTRIBUTOR: "Rotational contributor with starter upside",
  DEVELOPMENTAL: "Developmental depth piece",
  DO_NOT_RECRUIT: "Below our recruiting threshold",
};

type WorkflowToolName =
  | "getFollowUpsDueToday"
  | "getTopUncontactedTargets"
  | "getHighPriorityPlayersWithoutOwner"
  | "summarizeRecruitingBoard"
  | "getEvaluatedToWatchlistCandidates";

function workflowCall(
  tool: WorkflowToolName,
  args: Record<string, unknown>,
  resultSummary: string,
): AssistantToolCall {
  // The shared AssistantToolCall union predates workflow tools. Keep the public
  // response contract unchanged while exposing the concrete runtime tool name.
  return { tool, args, resultSummary } as unknown as AssistantToolCall;
}

function workflowLine(record: WorkflowPlayerRecord, index: number): string {
  const { player, boardEntry } = record;
  const workflowOwner = record.workflow?.owner as { name?: string } | undefined;
  const evidence = [
    `fit ${player.fitScore ?? "—"}`,
    record.workflow?.status
      ? String(record.workflow.status).toLowerCase().replace(/_/g, " ")
      : boardEntry?.canonicalStage.toLowerCase().replace(/_/g, " "),
    workflowOwner?.name
      ? `owner ${workflowOwner.name}`
      : boardEntry?.assignedToName
        ? `owner ${boardEntry.assignedToName}`
        : (record.workflow && !record.workflow.owner) || (boardEntry && !boardEntry.assignedToId)
          ? "no owner"
          : undefined,
    record.daysSinceContact != null ? `${record.daysSinceContact} days since contact` : undefined,
    record.nextFollowUpAt ? `follow-up ${record.nextFollowUpAt.slice(0, 10)}` : undefined,
    record.reasons?.[0],
  ].filter(Boolean);
  return `${index + 1}. **${player.fullName}** (${player.primaryPosition}, ${player.currentSchool.name}) — ${evidence.join(", ")}`;
}

export class MockAIProvider implements AIProvider {
  readonly model = "mock-portaliq-v1";
  constructor(private tools: PortalTools) {}

  async generateScoutingReport(playerId: string): Promise<ScoutingReportOutput> {
    const detail = await this.tools.getPlayerDetail(playerId);
    if (!detail) throw new Error(`Player ${playerId} not found`);
    const org = await this.tools.getOrg();
    const { player: p, stats, measurements, similar, fit } = detail;
    const latest = stats[0];
    const meta = POSITION_META[p.primaryPosition];
    const fitTotal = fit?.total ?? p.fitScore ?? 60;
    const tier = tierFromScore(fitTotal);
    const meas = measurements[0];

    const strengths: string[] = [];
    if ((p.productionScore ?? 0) >= 65)
      strengths.push(`Productive against his level — ${p.productionScore}th-percentile production among portal ${p.positionGroup}s (${keyStat(p, latest)}).`);
    if (p.stars >= 4)
      strengths.push(`Blue-chip pedigree (${p.stars}★, ${p.compositeRating.toFixed(4)} composite) that translated to the field.`);
    if (meas?.fortyYard && meas.fortyYard <= 4.55 && ["WR", "DB", "RB"].includes(p.positionGroup))
      strengths.push(`Plus athleticism — verified ${meas.fortyYard}s forty${meas.verticalInches ? `, ${meas.verticalInches}" vertical` : ""}.`);
    if (p.eligibility.yearsRemaining >= 2)
      strengths.push(`Multi-year asset with ${p.eligibility.yearsRemaining} years of eligibility remaining.`);
    if (p.awards.length) strengths.push(`Decorated: ${p.awards.slice(0, 2).join(", ")}.`);
    if (strengths.length === 0) strengths.push(`Experienced ${meta.label.toLowerCase()} with starting reps (${keyStat(p, latest)}).`);

    const weaknesses: string[] = [];
    if ((p.productionScore ?? 50) < 45)
      weaknesses.push(`Production trails peers (${p.productionScore}th percentile) — projection leans on traits over tape.`);
    if (p.eligibility.yearsRemaining <= 1)
      weaknesses.push(`Limited runway (${p.eligibility.yearsRemaining} year of eligibility) — strictly a win-now add.`);
    const latestDrop = latest?.metrics?.dropRate;
    if (typeof latestDrop === "number" && latestDrop >= 8)
      weaknesses.push(`Concentration drops a concern (${latestDrop}% drop rate).`);
    if (p.positionGroup === "WR" && p.weightLbs < 180)
      weaknesses.push(`Slight frame (${p.weightLbs} lb) — press coverage and run support questions.`);
    if (weaknesses.length === 0) weaknesses.push("Needs continued refinement against top-tier competition; no glaring red flags on tape.");

    const riskFactors: string[] = [];
    if (p.injuryFlags.length) riskFactors.push(`Medical: ${p.injuryFlags.join(", ")}.`);
    if (p.characterFlags.length) riskFactors.push(`Off-field flag noted — vet through compliance.`);
    if (p.previousSchoolIds.length >= 1) riskFactors.push(`Multiple transfers — confirm fit and motivation.`);
    if (p.scholarshipStatus !== "SCHOLARSHIP") riskFactors.push(`Currently ${p.scholarshipStatus.replace(/_/g, " ").toLowerCase()}.`);
    if ((p.nilEstimate ?? 0) >= 250_000) riskFactors.push(`NIL ask is significant (~$${Math.round((p.nilEstimate ?? 0) / 1000)}k).`);
    if (riskFactors.length === 0) riskFactors.push("Low-risk profile — clean medical and one prior program.");

    const young = ["FR", "RS-FR", "SO", "RS-SO"].includes(p.eligibilityClass);
    const developmentPotential = young && p.eligibility.yearsRemaining >= 3
      ? "High — young with a multi-year runway to develop within the program."
      : p.eligibility.isGraduate || p.eligibilityClass.includes("SR")
        ? "Limited — finished product; value is immediate, not projection."
        : "Moderate — room to grow with a year in the system.";

    const offenseSide = meta.side === "offense";
    const schemeFit = `Projects as a ${fitTotal >= 75 ? "clean" : "workable"} fit in Maryland's ${
      offenseSide ? org.offenseScheme.replace(/_/g, " ").toLowerCase() : org.defenseScheme.replace(/_/g, " ").toLowerCase()
    } ${offenseSide ? "offense" : "defense"} (scheme-fit component ${Math.round(fit?.components.find((c) => c.key === "scheme")?.value ?? 60)}/100).`;

    return {
      headline: `${tier === "CHAMPION" || tier === "STARTER" ? "Priority" : "Tracked"} ${meta.label} — fit ${fitTotal}, ${p.eligibility.yearsRemaining} yr left`,
      summary: `${p.fullName} is a ${p.stars}★ ${meta.label.toLowerCase()} from ${p.currentSchool.name} (${p.currentSchool.conference}) measuring ${formatHeight(p.heightInches)}/${p.weightLbs}. ${keyStat(p, latest)} in 2025. Grades out as a ${tier.replace(/_/g, " ").toLowerCase()} for our scheme.`,
      strengths,
      weaknesses,
      riskFactors,
      developmentPotential,
      schemeFit,
      projection: tier,
      role: ROLE_BY_TIER[tier],
      bottomLine:
        tier === "CHAMPION" || tier === "STARTER"
          ? `Pursue aggressively. ${p.fullName} answers a real need and fits the scheme — get him on a visit and prioritize contact.`
          : tier === "CONTRIBUTOR"
            ? `Keep evaluating. Worth an offer if the board thins at ${p.primaryPosition}; solid floor, useful depth.`
            : `Monitor. Below our current bar unless the position room takes further hits.`,
      comparablePlayers: similar.slice(0, 3).map((s) => `${s.fullName} (${s.currentSchool.name})`),
      confidence: fitTotal >= 80 ? "HIGH" : "MED",
      sourceRefs: [
        { label: "Fit score", value: String(fitTotal) },
        { label: "Production percentile", value: String(p.productionScore ?? "—") },
        { label: "2025 line", value: keyStat(p, latest) },
        ...(meas?.fortyYard ? [{ label: "Forty", value: `${meas.fortyYard}s` }] : []),
      ],
    };
  }

  async answerQuery({ question }: AssistantQuery): Promise<AssistantAnswer> {
    const parsed = parseQuery(question);
    const workflowIntents = [
      "follow_up_today",
      "uncontacted_targets",
      "unowned_priority",
      "board_summary",
      "evaluated_to_watchlist",
    ];

    if (workflowIntents.includes(parsed.intent)) {
      return this.answerWorkflowQuery(parsed.intent, parsed.filters.positions?.[0], parsed.limit);
    }

    const results = (await this.tools.searchPlayers(parsed.filters)).slice(0, parsed.limit);
    const toolCalls: AssistantToolCall[] = [
      {
        tool: "searchPlayers",
        args: { ...parsed.filters },
        resultSummary: `${results.length} player${results.length === 1 ? "" : "s"} matched`,
      },
    ];

    if (results.length === 0) {
      return {
        answer:
          "No portal players match those filters. Try widening the conference, lowering the eligibility floor, or removing the weight cap.",
        playerIds: [],
        toolCalls,
        followUps: ["Show all Power-4 options", "Drop the eligibility filter", "Who's most undervalued right now?"],
        confidence: "LOW",
      };
    }

    const top = results[0];
    const filterText = parsed.notes.length ? ` (${parsed.notes.join("; ")})` : "";
    let answer: string;

    if (parsed.intent === "undervalued") {
      answer = `**${results.length}** undervalued targets surface${filterText}. The clearest **Moneyball** signal is **${top.fullName}** (${top.primaryPosition}, ${top.currentSchool.name}) — ${top.productionScore}th-percentile production on just a ${top.stars}★ pedigree (**+${top.undervaluation}** value gap), with fit **${top.fitScore}** and ${top.eligibility.yearsRemaining} years left.`;
    } else if (parsed.intent === "compare") {
      const lines = results.map((p, i) => `${i + 1}. **${p.fullName}** (${p.currentSchool.name}) — fit ${p.fitScore}, ${p.eligibility.yearsRemaining} yr, ${keyStat(p)}`);
      answer = `Comparing the top ${results.length} available by fit${filterText}:\n\n${lines.join("\n")}`;
      toolCalls.push({
        tool: "comparePlayers",
        args: { ids: results.map((p) => p.id) },
        resultSummary: `${results.length} players compared side-by-side`,
      });
    } else if (parsed.intent === "similar") {
      answer = `Closest profiles in the portal${filterText}: **${top.fullName}** (${top.currentSchool.name}, fit ${top.fitScore}) leads ${results.length} comparable options. Open any to see a full similarity breakdown.`;
      toolCalls.push({
        tool: "findSimilarPlayers",
        args: { playerId: top.id },
        resultSummary: `ranked ${results.length} by profile similarity`,
      });
    } else if (parsed.intent === "scheme") {
      answer = `Best scheme fits for Maryland${filterText}: **${top.fullName}** (${top.primaryPosition}, ${top.currentSchool.name}) tops the board at fit **${top.fitScore}**, ahead of ${results.length - 1} others. Ranked by our deterministic scheme-fit model.`;
    } else {
      answer = `Found **${results.length}** matching players${filterText}. Top fit is **${top.fullName}** (${top.primaryPosition}, ${top.currentSchool.name}) — fit **${top.fitScore}**, ${top.eligibility.yearsRemaining} yr left, ${keyStat(top)}.${(top.undervaluation ?? 0) >= 20 ? " ⚑ Flagged undervalued." : ""}`;
    }

    return {
      answer,
      playerIds: results.map((p) => p.id),
      toolCalls,
      followUps: [
        parsed.intent === "undervalued" ? "Compare the top 3" : "Who is most undervalued here?",
        "Filter to 2+ years of eligibility",
        "Add the top option to the board",
      ],
      confidence: results.length >= 3 ? "HIGH" : "MED",
    };
  }

  private async answerWorkflowQuery(
    intent: ReturnType<typeof parseQuery>["intent"],
    position: Player["primaryPosition"] | undefined,
    limit: number,
  ): Promise<AssistantAnswer> {
    if (!this.tools.hasWorkflowSupport?.()) {
      const unavailableTool: WorkflowToolName =
        intent === "follow_up_today" ? "getFollowUpsDueToday"
          : intent === "uncontacted_targets" ? "getTopUncontactedTargets"
            : intent === "unowned_priority" ? "getHighPriorityPlayersWithoutOwner"
              : intent === "board_summary" ? "summarizeRecruitingBoard"
                : "getEvaluatedToWatchlistCandidates";
      return {
        answer: "Workflow data is not wired into the assistant yet, so I can’t answer that from board and contact records without guessing.",
        playerIds: [],
        toolCalls: [
          workflowCall(unavailableTool, { position, limit }, "workflow service unavailable"),
        ],
        followUps: ["Show top portal targets instead", "Show best scheme fits", "Who is most undervalued?"],
        confidence: "LOW",
      };
    }

    let records: WorkflowPlayerRecord[] = [];
    let answer = "";
    let toolCall: AssistantToolCall;

    if (intent === "follow_up_today") {
      records = await this.tools.getFollowUpsDueToday?.() ?? [];
      toolCall = workflowCall("getFollowUpsDueToday", {}, `${records.length} follow-up${records.length === 1 ? "" : "s"} due today`);
      answer = records.length
        ? `**${records.length} player${records.length === 1 ? "" : "s"} need follow-up today**, based on contact cadence and board status:\n\n${records.map(workflowLine).join("\n")}`
        : "No player follow-ups are due today in the workflow records.";
    } else if (intent === "uncontacted_targets") {
      records = await this.tools.getTopUncontactedTargets?.(position, limit) ?? [];
      toolCall = workflowCall(
        "getTopUncontactedTargets",
        { position, limit },
        `${records.length} uncontacted target${records.length === 1 ? "" : "s"} ranked`,
      );
      answer = records.length
        ? `Top uncontacted${position ? ` **${position}**` : ""} targets, ranked from workflow and player data:\n\n${records.map(workflowLine).join("\n")}`
        : `No uncontacted${position ? ` ${position}` : ""} targets were found in the workflow records.`;
    } else if (intent === "unowned_priority") {
      records = await this.tools.getHighPriorityPlayersWithoutOwner?.(limit) ?? [];
      toolCall = workflowCall(
        "getHighPriorityPlayersWithoutOwner",
        { limit },
        `${records.length} high-priority unowned player${records.length === 1 ? "" : "s"} found`,
      );
      answer = records.length
        ? `**${records.length} high-priority player${records.length === 1 ? " has" : "s have"} no owner**:\n\n${records.map(workflowLine).join("\n")}`
        : "Every high-priority player currently has an owner.";
    } else if (intent === "board_summary") {
      const summary = await this.tools.summarizeRecruitingBoard?.(position) ?? null;
      records = summary?.records.slice(0, limit) ?? [];
      toolCall = workflowCall(
        "summarizeRecruitingBoard",
        { position },
        summary ? `${summary.total} board players summarized` : "no board summary available",
      );
      if (!summary) {
        answer = `No${position ? ` ${position}` : ""} board records were found.`;
      } else {
        const stages = Object.entries(summary.stageCounts)
          .filter(([, count]) => count)
          .map(([stage, count]) => `${stage.toLowerCase().replace(/_/g, " ")} ${count}`)
          .join(", ");
        const leaders = records.slice(0, 5);
        answer = `**${position ? `${position} board` : "Board"} summary:** ${summary.total} players; ${stages || "no staged players"}; ${summary.ownedCount} owned and ${summary.unownedCount} unowned${summary.averageFitScore != null ? `; average fit **${summary.averageFitScore}**` : ""}.${leaders.length ? `\n\nTop records:\n${leaders.map(workflowLine).join("\n")}` : ""}`;
      }
    } else {
      records = await this.tools.getEvaluatedToWatchlistCandidates?.(limit) ?? [];
      toolCall = workflowCall(
        "getEvaluatedToWatchlistCandidates",
        { limit },
        `${records.length} evaluated-to-watchlist candidate${records.length === 1 ? "" : "s"} found`,
      );
      answer = records.length
        ? `These evaluated players have workflow evidence to move to the watchlist:\n\n${records.map(workflowLine).join("\n")}`
        : "No evaluated players currently meet the workflow criteria to move to the watchlist.";
    }

    return {
      answer,
      playerIds: records.map((record) => record.player.id),
      toolCalls: [toolCall],
      followUps: [
        "Who needs follow-up today?",
        position ? `Summarize the ${position} board` : "Show high-priority players with no owner",
        "Show players that should move to the watchlist",
      ],
      confidence: records.length ? "HIGH" : "MED",
    };
  }

  async analyzeTeamNeeds(): Promise<TeamNeedsAnalysis> {
    const needs = await this.tools.getTeamNeeds();
    const ranked = [...needs].sort((a, b) => b.needScore - a.needScore);
    const top = ranked.slice(0, 5);

    const recommendedTargets: TeamNeedsAnalysis["recommendedTargets"] = [];
    for (const need of ranked.filter((n) => n.priority === "CRITICAL" || n.priority === "HIGH").slice(0, 4)) {
      const candidates = await this.tools.searchPlayers({
        positions: [need.position],
        portalStatuses: ["IN_PORTAL"],
        sortBy: "fitScore",
        sortDir: "desc",
        limit: 1,
      });
      const best = candidates[0];
      if (best)
        recommendedTargets.push({
          playerId: best.id,
          reason: `${best.fullName} (fit ${best.fitScore}) is the top available fit to address ${need.position}.`,
        });
    }

    const critical = top.filter((n) => n.priority === "CRITICAL").map((n) => n.position);
    return {
      headline: critical.length
        ? `Roster construction: ${critical.join(", ")} ${critical.length === 1 ? "is a" : "are"} critical gap${critical.length === 1 ? "" : "s"}.`
        : "Roster is balanced — address depth opportunistically.",
      summary: `Across ${needs.length} position rooms, ${ranked.filter((n) => n.priority === "CRITICAL").length} are critical and ${ranked.filter((n) => n.priority === "HIGH").length} are high priority. The portal board should weight toward ${top.slice(0, 3).map((n) => n.position).join(", ")}.`,
      priorities: top.map((n) => ({
        position: n.position,
        rationale: n.notes ?? `${n.projectedReturning} projected to return vs. ${n.idealDepth} ideal (${n.projectedDepartures} departures).`,
        needScore: n.needScore,
      })),
      recommendedTargets,
    };
  }
}
