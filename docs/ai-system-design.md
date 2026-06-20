# PortalIQ — AI System Design

**Project:** "Moneyball for Maryland" — NCAA D1 (FBS) College Football Transfer Portal Intelligence Platform
**Scope:** FOOTBALL ONLY.
**Author:** Agent 5 — AI Systems Architect
**Status:** Implementation-ready design for the AI layer. Phase 1 = deterministic `MockAIProvider`. Phase 2 = `ClaudeAIProvider` on **Claude Opus 4.8** (`claude-opus-4-8`) via the Anthropic API.

> **The non-negotiable boundary.** The AI layer is a *consumer* of the same service/repository chain as the rest of the app (per `system-architecture.md` §1, §9). It never reads Firestore or mock arrays directly, never imports an SDK into a feature, and never invents data. Everything it "knows" about a player arrives as structured input pulled by a service through a repository. The provider is selected exactly once, in `di.ts` / `src/ai/index.ts`. Real LLM calls run server-side only (`app/api/ai/*` route handlers), keeping keys off the client.

---

## 1. AI Capabilities Overview

Six AI capabilities, each grounded in the entities from `database-design.md` and surfaced at a specific product point.

| # | Capability | Where it surfaces | Backing entity | Phase-1 deterministic? |
|---|---|---|---|---|
| 1 | **AI Recruiting Assistant** (flagship) | `features/ai-assistant` (dedicated page) + a query bar on Portal & Dashboard | reads `Player`, `TeamNeeds`, `RosterSnapshot`; writes nothing | ✅ rule-based NL parsing |
| 2 | **AI Scouting Reports** | `features/player-profile`, `features/reports` | writes `AIInsight` (`type: SCOUTING_REPORT`) | ✅ templated prose |
| 3 | **Team-Needs Analysis** | `features/team-needs` | reads `TeamNeeds` + `RosterSnapshot`; writes `AIInsight` (`FIT_ANALYSIS`) | ✅ templated + heuristic |
| 4 | **Fit Score** | `Player` cards, Portal sort, Profile | computes/caches `Player.fitScore` | ✅ pure heuristic (no LLM ever) |
| 5 | **Undervaluation / Moneyball signal** | Dashboard recs, Portal "undervalued" flag, Profile badge | `Player.tags` + computed metric | ✅ pure formula |
| 6 | **Similar Players** | Profile ("plays like…"), Compare tray | computed feature-vector distance | ✅ pure distance metric |

**Dashboard recommendations** (`features/dashboard`) are a *composition*, not a new model: they blend `fitScore` × `needScore` × undervaluation × `daysLeftInWindow` into the ranked daily action list. Capabilities 4–6 are **pure functions in the service layer** and require no LLM in any phase — the LLM only ever *narrates* their output. Capabilities 1–3 are LLM-shaped but ship as deterministic mocks in Phase 1.

---

## 2. AI Recruiting Assistant (Flagship)

A natural-language query interface: "Find Power 4 linebackers with 2 years eligibility remaining" → ranked result cards + a football-literate sentence. The Phase-2 design is **tool use / function calling**; the Phase-1 mock implements the *same pipeline* with rule-based parsing.

### 2.1 Pipeline

```
NL query
  │
  ▼
[1] Intent + entity parsing      → { intent, entities }
  │   Phase 1: keyword/regex rules     Phase 2: Claude Opus 4.8 with tools
  ▼
[2] Map to tool call(s)          → searchPlayers(filters) | comparePlayers(ids) | getTeamNeeds() | getPlayer(id) | findSimilar(playerId)
  │
  ▼
[3] Execute via SERVICE layer    → SearchService / TeamNeedsService / FitScoreService
  │   (services call repositories; the assistant NEVER touches repos directly)
  ▼
[4] Rank results                 → fitScore desc, then needScore, then yearsRemaining
  │
  ▼
[5] Compose answer               → NL sentence + structured result cards + sourceRefs
```

The assistant is a **read-only orchestrator**. It can call tools that *read* the portal/roster; it cannot move board entries, write evaluations, or mutate state. That keeps the trust surface small and means the same code path is safe to expose on the Dashboard query bar.

### 2.2 The Tools (function-calling contract)

Five tools. Each maps 1:1 to an existing service method, so the LLM never needs a bespoke endpoint.

```ts
// src/ai/tools.ts — the assistant's tool surface (Phase 2 JSON schemas below).
export interface AssistantTools {
  /** Filter/rank the scouted player set. The workhorse. */
  searchPlayers(filters: PlayerQuery): Promise<PlayerCard[]>;
  /** Side-by-side comparison of 2–4 players. */
  comparePlayers(playerIds: string[]): Promise<ComparisonResult>;
  /** Roster gaps by position for the active org. */
  getTeamNeeds(args?: { position?: PositionCode }): Promise<PositionNeed[]>;
  /** Full detail for one player (resolves name → id first if needed). */
  getPlayer(playerId: string): Promise<PlayerDetail>;
  /** Position-normalized nearest neighbours to a reference player. */
  findSimilarPlayers(args: { playerId: string; limit?: number }): Promise<SimilarPlayer[]>;
}
```

**`PlayerQuery` — the structured filter the NL query collapses into.** This is the spine of the whole assistant; every example below produces one of these.

```ts
export interface PlayerQuery {
  positions?: PositionCode[];        // ["LB","ILB","OLB"]
  positionGroups?: PositionGroup[];  // ["LB"] — broadens to a room
  conferences?: Conference[];        // explicit list…
  conferenceTier?: "POWER_4" | "GROUP_OF_5"; // …or a tier shorthand
  minYearsRemaining?: number;        // 2
  maxYearsRemaining?: number;
  heightInchesMin?: number; heightInchesMax?: number;
  weightLbsMin?: number;   weightLbsMax?: number;  // "under 310 pounds" → weightLbsMax: 310
  minStars?: number; maxStars?: number;
  minCompositeRating?: number;
  statThresholds?: { metric: string; op: ">=" | "<=" | ">" | "<"; value: number }[];
  portalStatus?: PortalStatus[];     // default ["IN_PORTAL"]
  minFitScore?: number;
  undervaluedOnly?: boolean;         // "undervalued" / "outperform their ranking"
  schemeFitFor?: { side: "offense" | "defense" }; // "fits Maryland's scheme"
  sortBy?: "fitScore" | "needScore" | "compositeRating" | "undervaluation" | "yearsRemaining";
  limit?: number;                    // default 10
}
```

`PlayerQuery` is a Zod schema in `src/types/ai.ts`; `SearchService.searchPortal()` already accepts the closely-related `PlayerFilters`, so the assistant's job is `PlayerQuery → PlayerFilters` plus the AI-only predicates (`undervaluedOnly`, `schemeFitFor`) that the service resolves via `FitScoreService` and the undervaluation metric (§6).

### 2.3 Tool JSON Schemas (Phase 2, Anthropic tool use)

```jsonc
// Passed in the `tools` array to client.messages.create on claude-opus-4-8.
[
  {
    "name": "searchPlayers",
    "description": "Search and rank transfer-portal players by structured filters. Use this for any 'find / show me / who are' query naming a position, conference, eligibility, measurables, stats, rating, or fit. Returns ranked player cards.",
    "input_schema": {
      "type": "object",
      "properties": {
        "positions":        { "type": "array", "items": { "type": "string", "enum": ["QB","RB","FB","WR","TE","OT","OG","C","EDGE","DT","NT","LB","ILB","OLB","CB","S","NB","K","P","LS","KR","PR"] } },
        "conferenceTier":   { "type": "string", "enum": ["POWER_4","GROUP_OF_5"] },
        "conferences":      { "type": "array", "items": { "type": "string" } },
        "minYearsRemaining":{ "type": "integer", "minimum": 0, "maximum": 5 },
        "weightLbsMax":     { "type": "integer" },
        "weightLbsMin":     { "type": "integer" },
        "minStars":         { "type": "integer", "minimum": 2, "maximum": 5 },
        "statThresholds":   { "type": "array", "items": {
            "type": "object",
            "properties": {
              "metric": { "type": "string" },
              "op":     { "type": "string", "enum": [">=","<=",">","<"] },
              "value":  { "type": "number" }
            },
            "required": ["metric","op","value"], "additionalProperties": false
        }},
        "undervaluedOnly":  { "type": "boolean" },
        "schemeFitFor":     { "type": "object", "properties": { "side": { "type": "string", "enum": ["offense","defense"] } }, "additionalProperties": false },
        "sortBy":           { "type": "string", "enum": ["fitScore","needScore","compositeRating","undervaluation","yearsRemaining"] },
        "limit":            { "type": "integer", "minimum": 1, "maximum": 50 }
      },
      "additionalProperties": false
    }
  },
  {
    "name": "comparePlayers",
    "description": "Compare 2 to 4 players side by side across measurables, production, fit, and eligibility. Use when the user names multiple players to compare.",
    "input_schema": {
      "type": "object",
      "properties": { "playerIds": { "type": "array", "items": { "type": "string" }, "minItems": 2, "maxItems": 4 } },
      "required": ["playerIds"], "additionalProperties": false
    }
  },
  {
    "name": "getTeamNeeds",
    "description": "Return the program's roster gaps ranked by need score. Use for 'what do we need', 'biggest hole', or to justify a recommendation.",
    "input_schema": {
      "type": "object",
      "properties": { "position": { "type": "string" } },
      "additionalProperties": false
    }
  },
  {
    "name": "getPlayer",
    "description": "Fetch full detail for one player by id. Call resolvePlayer first if you only have a name.",
    "input_schema": { "type": "object", "properties": { "playerId": { "type": "string" } }, "required": ["playerId"], "additionalProperties": false }
  },
  {
    "name": "findSimilarPlayers",
    "description": "Find portal players most similar to a reference player (position-normalized measurables + production + role). Use for 'similar to', 'like our starter', 'comps for'.",
    "input_schema": {
      "type": "object",
      "properties": { "playerId": { "type": "string" }, "limit": { "type": "integer", "minimum": 1, "maximum": 20 } },
      "required": ["playerId"], "additionalProperties": false
    }
  }
]
```

The Phase-2 call uses `claude-opus-4-8` with `thinking: { type: "adaptive" }` and `tool_choice: { type: "auto" }`. Claude emits a `tool_use` block; the route handler executes the matching service method, returns a `tool_result`, and Claude composes the final natural-language answer grounded in that result. Names are resolved to ids by a thin internal `resolvePlayer(name)` step before `getPlayer`/`comparePlayers`/`findSimilarPlayers` so the model never has to guess an id.

### 2.4 Worked Examples — query → parsed tool call

| # | NL query | Tool call |
|---|---|---|
| 1 | "Find Power 4 linebackers with 2 years eligibility remaining" | `searchPlayers({ positions:["LB","ILB","OLB"], conferenceTier:"POWER_4", minYearsRemaining:2, sortBy:"fitScore" })` |
| 2 | "Who fits Maryland's defensive scheme best?" | `searchPlayers({ schemeFitFor:{ side:"defense" }, sortBy:"fitScore", limit:10 })` |
| 3 | "Compare these 3 safeties" *(ids from compare tray)* | `comparePlayers({ playerIds:["player_a","player_b","player_c"] })` |
| 4 | "Who is most undervalued?" | `searchPlayers({ undervaluedOnly:true, sortBy:"undervaluation", limit:10 })` |
| 5 | "Show me all SEC offensive tackles under 310 pounds" | `searchPlayers({ positions:["OT"], conferences:["SEC"], weightLbsMax:310, sortBy:"compositeRating" })` |
| 6 | "Find portal WRs who outperform their recruiting ranking" | `searchPlayers({ positions:["WR"], undervaluedOnly:true, sortBy:"undervaluation" })` |
| 7 | "Which linebackers are most similar to our current starter?" | resolve starter → `findSimilarPlayers({ playerId:"player_starter_lb", limit:5 })` filtered to LB room |

Examples 4 and 6 both resolve to `undervaluedOnly` — the parser maps "undervalued", "overlooked", "outperform their ranking", "efficient/mispriced" to the same Moneyball predicate (§6). Example 2's `schemeFitFor` causes `SearchService` to pull `Organization.defenseScheme` and rank by `FitScoreService` output (§5).

---

## 3. AI Scouting Reports

Generates the `AIInsight` (`type: SCOUTING_REPORT`) for the Player Profile and Reports views, from a player's structured data.

### 3.1 Output Schema (strict JSON contract)

This is the exact shape the route handler validates with Zod before persisting via `AIInsightRepository`. It maps onto `AIInsight` (`database-design.md` §2.17).

```ts
export const ScoutingReportOutputSchema = z.object({
  strengths:            z.array(z.string()).min(1).max(6),
  weaknesses:           z.array(z.string()).min(1).max(6),
  riskFactors:          z.array(z.string()).max(5),        // injury/character/scheme-mismatch/eligibility
  developmentPotential: z.enum(["HIGH","MEDIUM","LOW"]),
  schemeFit: z.object({
    score:    z.number().min(0).max(100),                  // = fitScore (§5), passed in, not invented
    summary:  z.string(),
    fitsAs:   z.string(),                                  // "Cover-1 boundary corner"
  }),
  projection: z.object({
    role: z.enum(["CHAMPION","STARTER","CONTRIBUTOR","DEVELOPMENTAL","DO_NOT_RECRUIT"]),
    year: z.enum(["IMMEDIATE","YEAR_1","MULTI_YEAR"]),     // when they'd contribute
  }),
  bottomLine:  z.string().max(400),                        // → AIInsight.headline / summary
  sourceRefs:  z.array(z.object({ field: z.string(), value: z.union([z.string(), z.number()]) })),
  confidence:  z.enum(["LOW","MED","HIGH"]),
});
export type ScoutingReportOutput = z.infer<typeof ScoutingReportOutputSchema>;
```

`schemeFit.score`, `projection.role`, and `developmentPotential` are **passed into** the prompt as pre-computed values (from `FitScoreService`, consensus rollup, eligibility) — the model phrases them, it does not re-derive them. This is the core hallucination guard for reports.

### 3.2 Prompt Template (Phase 2)

**System prompt** (cached prefix — stable across all report requests, so it sits before the per-player content per `prompt-caching.md`):

```
You are a college football personnel scout for {{programName}}, an FBS program that runs a
{{offenseScheme}} offense and a {{defenseScheme}} defense. You write concise, evidence-based
transfer-portal scouting reports for the coaching staff.

RULES — these are absolute:
- Ground every claim in the PLAYER DATA provided. Never invent a stat, measurable, award, or
  injury. If a field is missing, say "not available" — do not estimate.
- The fitScore, projected role, and development tier are PROVIDED. Phrase them; do not change them.
- Cite the specific field behind each strength/weakness in sourceRefs.
- Be a scout, not a hype man. A 3rd-round-grade player gets a 3rd-round-grade report.
- Output ONLY valid JSON matching the provided schema. No prose outside the JSON.
```

**User prompt** (per player — the volatile suffix):

```
PLAYER DATA:
{{playerJson}}            // identity, primaryPosition, measurables, eligibility.yearsRemaining,
                         // stars, compositeRating, awards, injuryFlags, scholarshipStatus
SEASON STATS:
{{statsJson}}            // PlayerStats.metrics for primaryPosition, snaps, gamesStarted, pffOverall
PRE-COMPUTED SIGNALS (do not recompute — phrase these):
  fitScore: {{fitScore}}  ({{fitBreakdown}})
  projectedRole: {{consensusTier}}
  developmentPotential: {{devTier}}
  undervaluationGap: {{undervalGap}}   // production %ile − recruiting %ile (§6)
PROGRAM SCHEME FIT CRITERIA for {{position}}:
{{schemeCriteria}}       // target measurable ranges + trait weights for this position

Produce a scouting report as JSON conforming to ScoutingReportOutputSchema.
```

Phase-2 call: `claude-opus-4-8`, `output_config: { format: { type: "json_schema", schema: <ScoutingReportOutputSchema> } }` (structured outputs guarantee the JSON contract), adaptive thinking on. The result is stored as an `AIInsight` with `model: "claude-opus-4-8"`, `headline` = `bottomLine`, and `sourceRefs` populated for provenance.

---

## 4. AI Position / Team-Needs Analysis

Given the latest `RosterSnapshot` (depth + eligibility) and computed `TeamNeeds`, produce a recruiting-priority briefing and recommended portal targets.

### 4.1 Output Schema

```ts
export const TeamNeedsAnalysisSchema = z.object({
  positionWeaknesses: z.array(z.object({
    position: z.string(),
    severity: z.enum(["CRITICAL","HIGH","MEDIUM","LOW"]),   // = PositionNeed.priority
    reason:   z.string(),                                   // grounded in depth/eligibility
    rosterGap: z.object({
      idealDepth: z.number(), projectedReturning: z.number(),
      startersExpiring: z.number(),                         // count yearsRemaining<=1 at depthRank<=2
    }),
  })),
  recruitingPriorities: z.array(z.object({
    position: z.string(), rank: z.number(), rationale: z.string(),
  })),
  recommendedTargets: z.array(z.object({
    playerId: z.string(), playerName: z.string(), position: z.string(),
    fitScore: z.number(), whyThisPlayer: z.string(),       // ties target → the gap it fills
  })),
  bottomLine: z.string().max(400),
  confidence: z.enum(["LOW","MED","HIGH"]),
});
```

### 4.2 Prompt Template

**System:** same program persona as §3.2, plus *"You analyze roster construction. Recommend portal targets ONLY from the candidate list provided — never name a player not in the candidates."*

**User:**
```
DEPTH CHART (current roster by position):
{{rosterSlotsJson}}      // RosterSlot[]: position, depthRank, eligibilityClass, yearsRemaining, departureRisk
COMPUTED NEEDS:
{{teamNeedsJson}}        // PositionNeed[]: needScore, idealDepth, projectedReturning, priority
SCHOLARSHIP LEDGER: {{scholarshipMath}}
CANDIDATE PORTAL TARGETS (top fits at positions of need, pre-ranked):
{{candidatesJson}}       // up to N players with fitScore + position, already filtered to need positions

Produce a team-needs analysis as JSON conforming to TeamNeedsAnalysisSchema. Recommend only
from CANDIDATE PORTAL TARGETS. Severity must equal the provided PositionNeed.priority.
```

The candidate list is produced by the **service layer** (`SearchService.searchPortal` filtered to need positions, ranked by `fitScore`), so the LLM's recommendations are constrained to real, in-portal, scheme-fit players. Stored as `AIInsight` (`type: FIT_ANALYSIS`) keyed to the org/season.

---

## 5. Fit Score Model (transparent hybrid, LLM-optional)

`fitScore` (0–100) measures how well a player fits *this* program's scheme + roster. **Phase-1 implementable with zero LLM** — it's a deterministic weighted blend in `FitScoreService`. The LLM, when present, only adds a small *qualitative* nudge it must justify.

### 5.1 Feature List

| Feature | Source | Range | What it measures |
|---|---|---|---|
| `positionNeed` | `TeamNeeds.needScore` for player's position | 0–1 | Does the roster need this position? |
| `schemeCriteriaMatch` | per-position fit profile vs `Scheme` (bible §7) | 0–1 | Trait/measurable alignment to the scheme |
| `productionPercentile` | player's `PlayerStats` vs position cohort | 0–1 | How productive relative to peers |
| `measurableFit` | measurables vs position target ranges (bible §2) | 0–1 | Inside ideal H/W/speed bands? |
| `eligibilityValue` | `eligibility.yearsRemaining` (3yr=1.0 … 0yr=0.2) | 0–1 | Multi-year value vs one-year rental |
| `pedigreeFloor` | `stars` / `compositeRating`, lightly weighted | 0–1 | Recruiting-pedigree safety floor |

### 5.2 Weights & Formula

```ts
const FIT_WEIGHTS = {
  positionNeed:        0.25,
  schemeCriteriaMatch: 0.30,   // scheme fit is the product thesis — weight it most
  productionPercentile:0.20,
  measurableFit:       0.12,
  eligibilityValue:    0.08,
  pedigreeFloor:       0.05,
};

function computeFitScore(f: FitFeatures): number {                 // each f.* ∈ [0,1]
  const base = 100 * (
      FIT_WEIGHTS.positionNeed        * f.positionNeed
    + FIT_WEIGHTS.schemeCriteriaMatch * f.schemeCriteriaMatch
    + FIT_WEIGHTS.productionPercentile* f.productionPercentile
    + FIT_WEIGHTS.measurableFit       * f.measurableFit
    + FIT_WEIGHTS.eligibilityValue    * f.eligibilityValue
    + FIT_WEIGHTS.pedigreeFloor       * f.pedigreeFloor
  );
  return clamp(Math.round(base), 0, 100);
}
```

`schemeCriteriaMatch` is itself a sub-score: each position has a fit profile (target measurable ranges + weighted traits) per the program's `OffenseScheme`/`DefenseScheme`. E.g. a Cover-1 (`MAN_COVERAGE`) CB weights `fortyYard`, `hipFluidity` (proxied by shuttle/3-cone), and `armLength`; a man-coverage criterion match scores higher for a press-capable corner than a zone corner.

### 5.3 Optional AI qualitative adjustment (Phase 2 only)

```
finalFitScore = clamp(base + aiAdjustment, 0, 100),  aiAdjustment ∈ [-5, +5]
```

The LLM may nudge ±5 points *with a one-sentence justification grounded in tape/stat context* (e.g. "+4: elite production behind a bottom-quartile O-line suggests the measurables understate him"). The deterministic `base` is always stored alongside, so the heuristic remains the source of truth and the UI can show "heuristic 78 → AI 82" with the reason. In Phase 1, `aiAdjustment = 0`.

---

## 6. Undervaluation / Moneyball Signal

A computable metric flagging players the market misprices — the product's core differentiator. **Pure formula, no LLM.**

```
productionPct(player)  = percentile of player's production score within position cohort   [0,1]
recruitingPct(player)  = percentile of compositeRating within position cohort             [0,1]
undervaluationGap      = productionPct − recruitingPct                                     [-1,1]
```

`production score` is a position-weighted composite of `PlayerStats.metrics` + `pffOverall` (e.g. for a CB: `passerRatingAllowed` (inverted), `passBreakups`, `interceptions`, `yardsPerCoverageSnap` inverted). Cohort = same `primaryPosition` across the scouted set with ≥ a minimum snap floor (avoid small-sample noise).

**Thresholds:**

| `undervaluationGap` | Flag | UI |
|---|---|---|
| ≥ 0.30 | `UNDERVALUED` (strong) | gold "Moneyball" badge on card + Dashboard rec |
| 0.15 – 0.30 | `UNDERVALUED` (mild) | "overlooked" tag |
| −0.15 – 0.15 | fairly valued | none |
| ≤ −0.30 | `OVERVALUED` | internal flag, surfaced only on Profile |

A gap ≥ 0.30 means the player produces in (say) the 85th percentile but was recruited in the 55th — exactly the G5-corner-with-elite-tape case from the product thesis. This drives `undervaluedOnly` in the assistant (§2.4 examples 4 & 6) and the Dashboard "most undervalued" list. The gap is written to `Player.tags` (`"undervalued"`) for query-layer filtering.

---

## 7. Similar Players

Position-normalized nearest-neighbour over a feature vector. **Deterministic.**

### 7.1 Feature vector (per player, position-normalized)

```ts
interface SimilarityVector {
  // measurables, z-scored within position cohort:
  heightZ: number; weightZ: number; speedZ: number;     // fortyYard inverted
  // production, percentile within position cohort:
  productionPct: number;                                 // same composite as §6
  // role/usage:
  snapsPct: number;                                      // workload
  starterShare: number;                                  // gamesStarted / gamesPlayed
  // pedigree (lightly weighted):
  compositeRatingZ: number;
}
```

All components are normalized **within the player's position cohort**, so "similar" compares like-for-like (a CB to CBs). Cross-position similarity is disallowed — `findSimilarPlayers` filters candidates to the reference player's `primaryPosition` (optionally widened to `positionGroup`).

### 7.2 Distance metric

Weighted Euclidean distance, converted to a 0–100 similarity:

```ts
const SIM_WEIGHTS = { measurables: 0.30, production: 0.35, role: 0.25, pedigree: 0.10 };

distance(a, b) = sqrt(
    0.30 * ((a.heightZ-b.heightZ)² + (a.weightZ-b.weightZ)² + (a.speedZ-b.speedZ)²)/3
  + 0.35 *  (a.productionPct-b.productionPct)²
  + 0.25 * ((a.snapsPct-b.snapsPct)² + (a.starterShare-b.starterShare)²)/2
  + 0.10 *  (a.compositeRatingZ-b.compositeRatingZ)²
);
similarity = round(100 * exp(-distance));   // monotonic, 100 = identical
```

Used for "plays like…" on the Profile and "most similar to our current starter" (§2.4 example 7) — the roster starter's vector is computed from the `RosterSlot` + any linked `Player` record, then matched against in-portal candidates.

---

## 8. AIProvider Abstraction

The TypeScript boundary the whole AI layer codes against. Lives in `src/ai/ai-provider.ts`. Two implementations; selection happens once.

```ts
// src/ai/ai-provider.ts
export interface AIProvider {
  /** Flagship assistant: NL query → answer + result cards. */
  answerQuery(input: AssistantQuery): Promise<AssistantAnswer>;
  /** Player profile scouting report. */
  generateScoutingReport(input: ScoutingReportInput): Promise<ScoutingReportOutput>;
  /** Team-needs briefing + recommended targets. */
  analyzeTeamNeeds(input: TeamNeedsInput): Promise<TeamNeedsAnalysis>;
  /** Generic short summary (e.g. "what changed" on the dashboard). */
  summarize(input: SummarizeInput): Promise<{ text: string; confidence: Confidence }>;
}

export interface AssistantQuery   { query: string; orgId: string; context?: { selectedPlayerIds?: string[] }; }
export interface AssistantAnswer  {
  answerText: string;
  resultCards: PlayerCard[];
  toolCalls: { tool: string; args: unknown }[];   // for transparency / debugging
  sourceRefs: { field: string; value: string | number }[];
  confidence: Confidence;
}
```

Every method takes structured input and returns structured output validated by Zod — so the Mock and Claude providers are interchangeable and the feature layer can't tell them apart.

### 8.1 MockAIProvider (Phase 1, deterministic)

```ts
// src/ai/providers/mock.ts
export class MockAIProvider implements AIProvider {
  constructor(private services = getServices()) {}   // SAME services the LLM provider uses

  async answerQuery(q: AssistantQuery): Promise<AssistantAnswer> {
    const parsed = parseQueryRuleBased(q.query);             // §10 — keyword/regex → PlayerQuery
    const cards  = await this.services.search.searchPortal(toFilters(parsed));
    return {
      answerText: renderAnswerTemplate(parsed, cards),       // templated, data-driven sentence
      resultCards: cards,
      toolCalls: [{ tool: "searchPlayers", args: parsed }],
      sourceRefs: cards.slice(0, 3).map(c => ({ field: "fitScore", value: c.fitScore })),
      confidence: cards.length ? "MED" : "LOW",
    };
  }
  // generateScoutingReport / analyzeTeamNeeds / summarize → templated prose (§10)
}
```

### 8.2 ClaudeAIProvider (Phase 2, Opus 4.8)

```ts
// src/ai/providers/anthropic.ts  — runs SERVER-SIDE only (app/api/ai/*)
import Anthropic from "@anthropic-ai/sdk";

export class ClaudeAIProvider implements AIProvider {
  private client = new Anthropic();                  // ANTHROPIC_API_KEY from server env
  private model = "claude-opus-4-8";

  async answerQuery(q: AssistantQuery): Promise<AssistantAnswer> {
    // Tool-use loop: Claude parses NL → emits tool_use → we execute via services → tool_result.
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: ASSISTANT_SYSTEM_PROMPT,                // grounding rules (§9), cached prefix
      tools: ASSISTANT_TOOLS,                         // §2.3 schemas
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: q.query }],
    });
    // execute tool_use via this.services.*, feed tool_result back, compose final answer…
    return parseAssistantAnswer(res); // Zod-validated against AssistantAnswer
  }
  // generateScoutingReport → output_config.format = ScoutingReportOutputSchema (structured outputs)
}
```

### 8.3 Selection in di.ts

The AI provider is wired alongside repositories, then injected into AI services — same single-swap-point discipline as the data backend.

```ts
// src/ai/index.ts
import type { AIProvider } from "./ai-provider";
import { MockAIProvider } from "./providers/mock";

const AI_BACKEND = process.env.NEXT_PUBLIC_AI_BACKEND ?? "mock";

export const aiProvider: AIProvider =
  AI_BACKEND === "anthropic"
    ? new (require("./providers/anthropic").ClaudeAIProvider)()  // lazy-required → SDK off Phase-1 bundle
    : new MockAIProvider();
```

`di.ts` exposes `aiProvider` through the same container accessor pattern as `getServices()`/`getRepositories()`. Flipping `NEXT_PUBLIC_AI_BACKEND` from `"mock"` to `"anthropic"` is the entire Phase-1 → Phase-2 AI migration at the app layer — no feature, hook, or service-interface code changes.

---

## 9. Guardrails

**Hallucination control — grounding is mandatory.**
- Every prompt instructs: *answer strictly from provided data; never invent a stat, measurable, award, or injury; say "not available" for missing fields.* (See system prompts §3.2, §4.2.)
- Pre-computed signals (`fitScore`, `needScore`, undervaluation gap, consensus tier) are **passed in and phrased, never re-derived** by the model.
- The assistant can only *read* via the five tools — it cannot fabricate a player; `searchPlayers`/`getPlayer` return real records or empty.
- **Structured outputs** (`output_config.format`) on reports/analysis guarantee the JSON contract — malformed output can't reach the `AIInsight` repository.

**Citation / provenance.** Every report and answer carries `sourceRefs: { field, value }[]` (`AIInsight.sourceRefs`), so the UI can render "Strength: man-coverage — *passerRatingAllowed 71.2, PBUs 14*". This is what makes outputs *overridable and trustable* per the product's trust requirement (`product-strategy.md` §9).

**Confidence handling.** Every output has `confidence ∈ {LOW, MED, HIGH}`, driven by data completeness (missing stats/measurables → lower confidence) and sample size (low snaps → lower). The UI badges low-confidence outputs and prompts human review (Phase 1 requires human review of all reports).

**Caching AI outputs.** Generated reports/analyses persist as versioned `AIInsight` documents (subcollection `players/{id}/aiInsights`); the latest `headline`/`summary` cache onto `Player.aiInsightId`. The route handler checks for a fresh insight (`generatedAt` within TTL, player `updatedAt` not newer) before calling the LLM — re-generation only on stale data or explicit user request.

**Cost / latency.** Opus 4.8 input/output ≈ \$5/\$25 per 1M tokens. Mitigations: (1) **prompt caching** on the stable system prefix (scheme criteria, persona) — render order tools→system→messages keeps the per-player payload as the only volatile suffix; (2) cache insights to avoid regeneration; (3) the assistant's *retrieval* is deterministic service work — the LLM only parses the query and narrates ~10 cards, keeping token counts modest; (4) reports run server-side and can be batched (Batches API, 50% cost) for bulk Profile generation. AI failures degrade gracefully ("couldn't generate — retry") and never block the page (`system-architecture.md` §11).

---

## 10. Phase-1 Mock Strategy (no real LLM, still compelling)

The whole point: ship all six AI capabilities convincingly with **zero API calls**, because the *value* is in the deterministic football logic (fit, need, undervaluation, similarity) and the LLM only ever narrates it.

### 10.1 Deterministic NL parsing (`parseQueryRuleBased`)

A keyword/regex rule engine over the query string. Concrete and implementable:

```ts
function parseQueryRuleBased(q: string): PlayerQuery {
  const s = q.toLowerCase();
  const out: PlayerQuery = { portalStatus: ["IN_PORTAL"], sortBy: "fitScore", limit: 10 };

  // Positions — synonym map → PositionCode[]
  const POS: Record<string, PositionCode[]> = {
    "linebacker": ["LB","ILB","OLB"], "lb": ["LB","ILB","OLB"],
    "safet": ["S"], "corner": ["CB"], "cb": ["CB"], "wr": ["WR"], "receiver": ["WR"],
    "offensive tackle": ["OT"], "tackle": ["OT"], "edge": ["EDGE"], "qb": ["QB"], "quarterback":["QB"],
    "running back":["RB"], "rb":["RB"], "tight end":["TE"], "te":["TE"], "defensive tackle":["DT"],
  };
  for (const [k, v] of Object.entries(POS)) if (s.includes(k)) out.positions = [...(out.positions ?? []), ...v];

  // Conference tiers / names
  if (/power\s*(4|four|5|five)|p4|p5/.test(s)) out.conferenceTier = "POWER_4";
  if (/group of (5|five)|g5/.test(s))          out.conferenceTier = "GROUP_OF_5";
  for (const c of ["SEC","Big Ten","ACC","Big 12","American","Mountain West","Sun Belt","MAC"])
    if (s.includes(c.toLowerCase())) out.conferences = [...(out.conferences ?? []), c as Conference];

  // Eligibility — "2 years (eligibility) remaining/left"
  const yrs = s.match(/(\d)\s*year/);            if (yrs) out.minYearsRemaining = +yrs[1];

  // Weight — "under 310 pounds", "over 250 lbs"
  const wU = s.match(/under\s*(\d{3})\s*(?:lb|pound)/); if (wU) out.weightLbsMax = +wU[1];
  const wO = s.match(/over\s*(\d{3})\s*(?:lb|pound)/);  if (wO) out.weightLbsMin = +wO[1];

  // Moneyball intent
  if (/undervalued|overlooked|outperform|mispriced|efficient|sleeper/.test(s)) {
    out.undervaluedOnly = true; out.sortBy = "undervaluation";
  }
  // Scheme fit
  if (/scheme|fit(s)? (maryland|our|the)|system fit/.test(s)) {
    out.schemeFitFor = { side: /defens|stop|coverage/.test(s) ? "defense" : "offense" };
  }
  // Similarity / comparison handled by separate intents (detect "similar to", "compare")
  return out;
}
```

Intent detection routes "compare X and Y" → `comparePlayers`, "similar to / like our starter" → `findSimilarPlayers`, "what do we need" → `getTeamNeeds`, else → `searchPlayers`. This covers all seven worked examples deterministically.

### 10.2 Templated, data-driven answers

The mock's prose is assembled from **real player fields** — it reads like an analyst because the numbers are real, even though the sentence frame is fixed:

```ts
function renderAnswerTemplate(q: PlayerQuery, cards: PlayerCard[]): string {
  if (!cards.length) return `No ${describe(q)} matched. Try widening the filters.`;
  const top = cards[0];
  return `Found ${cards.length} ${describe(q)}. Top fit: ${top.fullName} `
       + `(${top.currentSchool.name}, ${formatHtWt(top)}, ${top.yearsRemaining}yr left) — `
       + `fit score ${top.fitScore}${top.tags.includes("undervalued") ? ", flagged undervalued" : ""}.`;
}
// → "Found 7 Power 4 linebackers with 2 years left. Top fit: Marcus Reed (Iowa, 6'2\"/238, 2yr left) — fit score 86, flagged undervalued."
```

### 10.3 Templated scouting reports

`MockAIProvider.generateScoutingReport` fills the §3.1 schema from real fields + the deterministic signals (no LLM):
- **strengths/weaknesses** — derive from `PlayerStats.metrics` percentiles vs cohort: top-quartile metrics → strengths ("Elite coverage — 71.2 passer rating allowed, 88th %ile"), bottom-quartile → weaknesses, each with a `sourceRef`.
- **riskFactors** — from `injuryFlags`, `characterFlags`, `eligibility.yearsRemaining <= 1` ("one-year rental"), scheme-mismatch (low `schemeCriteriaMatch`).
- **schemeFit** — `score = fitScore`, `summary`/`fitsAs` from a per-scheme phrase table keyed by position.
- **projection.role** = `consensusTier` (or `fitScore`-derived bucket); **developmentPotential** from age/eligibility/upside heuristic.
- **bottomLine** — a template assembled from the above ("Multi-year starter-caliber fit for our man-coverage scheme; undervalued relative to a 3-star pedigree.").

### 10.4 Canned-but-data-driven team needs

`analyzeTeamNeeds` reads computed `TeamNeeds` + `RosterSnapshot`, fills the §4.1 schema deterministically: `positionWeaknesses` straight from `PositionNeed.priority`; `recommendedTargets` from the top `fitScore` in-portal players at need positions; rationale templated ("CB is CRITICAL — 2 of 3 two-deep corners expire after this season; we project 1 returning vs ideal depth 4.").

Because every mock output is built from real mock data and the same deterministic engines that Phase 2 will reuse, the upgrade to `ClaudeAIProvider` swaps *how the prose is generated*, not *what's true* — the football logic, schemas, grounding, and provenance are identical across phases.
