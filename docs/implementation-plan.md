# Moneyball for Maryland — Implementation Plan

**Orchestrator synthesis of the six specification documents.**
This is the build contract: what we build, in what order, and how each step traces back to the product's success criteria. Football only. NCAA D1 transfer-portal intelligence.

Source docs:
- [product-strategy.md](./product-strategy.md) — vision, personas, MVP scope, roadmap
- [football-workflows.md](./football-workflows.md) — domain bible (portal mechanics, positions, evaluation, needs, scheme fit)
- [system-architecture.md](./system-architecture.md) — layering, repositories, `di.ts` swap point
- [database-design.md](./database-design.md) — 17 entities, enums, mock-data ranges (**authoritative data model**)
- [ai-system-design.md](./ai-system-design.md) — assistant, scouting reports, fit score, undervaluation, similar players
- [ui-ux-design.md](./ui-ux-design.md) — war-room design language, Maryland tokens, page layouts, components

---

## 1. Success Criteria → Where It Lives

The MVP is done when a recruiting staffer can do these eight things. Each maps to a feature module and the layers beneath it.

| # | Capability | Page / Feature | Service / AI | Data |
|---|---|---|---|---|
| 1 | Search the transfer portal | `features/transfer-portal` → `/portal` | `SearchService.searchPortal` | `PlayerRepository.queryPlayers` |
| 2 | Evaluate players | `features/player-profile` → `/players/[id]` | `EvaluationService`, fit-score | `EvaluationRepository`, `Player` |
| 3 | Compare players | compare tray + `/compare` | `SearchService.compare` | `PlayerRepository.getMany` |
| 4 | Build recruiting boards | `features/recruiting-board` → `/board` | `BoardService.moveStage` | `RecruitingBoardRepository` |
| 5 | Analyze roster needs | `features/team-needs` → `/needs` | `TeamNeedsService.computeNeeds` | `RosterSnapshot`, `TeamNeeds` |
| 6 | Generate AI scouting reports | profile + `features/reports` | `AIProvider.generateScoutingReport` | `AIInsight` |
| 7 | Ask the AI assistant | `features/ai-assistant` → `/assistant` | `AIProvider.answerQuery` (tool use) | all repos via tools |
| 8 | Prioritize recruiting actions | `features/dashboard` → `/` | fit × need ranking | computed rollups |

---

## 2. Build Order (dependency-sequenced)

Strictly bottom-up so every layer compiles against the one below it. The architecture's invariant — UI → Hooks → Services → Repository Interfaces → Adapters, with `di.ts` the only swap point — is preserved at every step.

**Phase A — Foundation**
1. **Scaffold** — `package.json` (next, react, typescript, tailwind, @tanstack/react-query, zod, zustand, clsx), `tsconfig` with `@/*` paths, Tailwind theme seeded with the Maryland token set, `app/layout.tsx` + providers, sidebar nav shell.
2. **Types + Zod** (`src/types`) — the 17 entities + shared enums from `database-design.md` §1–2 as Zod schemas; `z.infer` types. Single source of truth.

**Phase B — Data**
3. **Mock data** (`src/lib/mock-data`) — deterministic generator producing **300+ players** across Big Ten / SEC / ACC / Big 12 / G5 using the per-position ranges in `database-design.md` §6. Plus schools, the Maryland org, users, a roster snapshot, team needs, a default board with entries, watchlists. Seeded RNG for reproducibility.
4. **Repositories + adapters + `di.ts`** — interfaces in `src/repositories`; `MockAdapter` implementations reading the seed; `di.ts` container; Firestore adapters as throwing stubs (Phase 2 contract).

**Phase C — Logic**
5. **Services** (`src/services`) — `fit-score` (deterministic hybrid, ai-system-design §5), `team-needs` (need-score math), `board` (role-gated stage transitions), `search` (filter composition + sort), `compare`, `undervaluation` + `similar-players` (ai-system-design §6–7).
6. **AI layer** (`src/ai`) — `AIProvider` interface; `MockAIProvider` (deterministic NL parser → tool calls → grounded answers; templated, data-driven scouting-report prose); `AnthropicAIProvider` stub defaulting to `claude-opus-4-8`. Selected in `src/ai/index.ts`.

**Phase D — Experience**
7. **Hooks** (`features/*/hooks`) — React Query wrappers over services; centralized query keys.
8. **Pages** — Dashboard, Transfer Portal, Player Profile, Recruiting Board, Team Needs, Reports, AI Assistant, Settings — built on the component inventory from `ui-ux-design.md`.

**Phase E — Verify**
9. **Build & smoke** — green production build + dev server via `.localnode`; screenshot the flagship screens.

---

## 3. Key Engineering Decisions (locked)

- **Authoritative model = `database-design.md`.** Field names like `primaryPosition`, `eligibility.yearsRemaining`, embedded `currentSchool` stamp, `fullName` are canonical. The architecture doc's Zod snippet was illustrative only.
- **Computed fields** (`fitScore`, `needScore`, `recruitingStatus`, `consensusTier`) are **service-layer functions**, cached onto the seed for sort/filter. Implementable with **zero LLM** in Phase 1.
- **AI is grounded, never inventive.** Mock provider assembles prose strictly from real player fields; the assistant maps NL → structured `PlayerFilters` via rule-based parsing that mirrors the Phase-2 tool-call schema (`searchPlayers`, `comparePlayers`, `getTeamNeeds`, `getPlayer`, `findSimilarPlayers`).
- **Single tenant in the seed** — `org_maryland` (Maryland, defense `MULTIPLE`/`NICKEL_425`, offense `SPREAD`/`RPO`) — drives scheme-fit weighting so fit scores are program-specific, per the "for Maryland" framing.
- **Theme** — dark "war-room" UI, Maryland Red `#E21833` / Gold `#FFD520` / near-black `#0B0B0C`, position-group color coding, tabular numerals for stats.
- **No heavy chart libs** — radar / heatmap / percentile bars / depth chart rendered in SVG + Tailwind.

## 4. Phasing (from product-strategy roadmap)

- **Phase 1 (this build):** full mock MVP — all 8 capabilities, no network, no keys. `DATA_BACKEND=mock`, `AI_BACKEND=mock`.
- **Phase 2:** Firebase — implement `src/adapters/firestore/*` + Firebase Auth; flip `di.ts`. No feature/service/interface changes. Swap `MockAIProvider` → `AnthropicAIProvider` (Opus 4.8) behind the same boundary.
- **Phase 3:** tests on the pure seams (fit-score / need-score math, Zod, services with mock repos), then film, NIL valuation, predictive commitment modeling.

## 5. Definition of Done (Phase 1)

- `npm run build` is green; `npm run dev` serves all eight pages.
- 300+ realistic players queryable by position, conference, years remaining, height/weight, rating, eligibility, portal status.
- Player profile shows bio, measurables, stats, eligibility, transfer history, film, AI scouting report, fit score, similar players, risk, timeline.
- Board supports drag-and-drop across the seven stages.
- Team Needs shows depth, departure risk, weaknesses, need heatmap, AI recommendations.
- AI Assistant answers the canonical example queries with grounded, data-driven results.
- It reads as football scouting software — not a generic dashboard.
