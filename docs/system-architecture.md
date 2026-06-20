# Moneyball for Maryland — System Architecture

**Platform:** AI-powered NCAA Division I College Football **Transfer Portal** intelligence platform.
**Stack (fixed):** Next.js (App Router) + TypeScript + Tailwind; React Query for server state; Zustand only where ephemeral UI state demands it; Zod for validation.
**Phases:** Phase 1 = all mock data. Phase 2 = Firebase (Firestore + Firebase Auth). Phase 3 = tests.

> **Repo-access assumption.** We could not access the prior repo `github.com/elvinsellappan/PortalIQ-new` (no `gh` CLI / no network in this environment). The Firebase abstraction below is therefore designed from **standard, idiomatic Firebase Auth + Firestore patterns** — not reverse-engineered from that codebase. Where Firestore specifics appear (collection layout, converters, `onSnapshot`), they reflect conventional Firebase practice and are intended to be the contract Phase 2 implements against, not a copy of prior code.

---

## 1. Architecture Overview

The single most important rule: **the UI never imports or knows about Firebase.** All data access flows through a strict, one-directional dependency chain. Each layer depends only on the **interface** of the layer below it, never on a concrete implementation. The only file that knows which concrete implementation is live is `src/lib/di.ts`.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  UI LAYER                                                                  │
│  src/app (routes, Server Components)  ·  src/components + src/features (UI) │
│  Renders. Owns no data logic. Knows nothing below Hooks.                    │
└───────────────────────────────┬──────────────────────────────────────────┘
                                 │ calls
┌───────────────────────────────▼──────────────────────────────────────────┐
│  HOOKS LAYER  — src/features/*/hooks  (React Query)                        │
│  useQuery / useMutation. Owns query keys, cache, invalidation.             │
│  Calls Services. Never calls a repository or Firebase directly.            │
└───────────────────────────────┬──────────────────────────────────────────┘
                                 │ calls
┌───────────────────────────────▼──────────────────────────────────────────┐
│  SERVICE LAYER  — src/services                                            │
│  Business logic & orchestration: fit-score, need analysis, stage          │
│  transitions, search composition. Pure(ish), repo-agnostic.               │
│  Gets repositories from the DI container.                                  │
└───────────────────────────────┬──────────────────────────────────────────┘
                                 │ depends on (interface only)
┌───────────────────────────────▼──────────────────────────────────────────┐
│  REPOSITORY INTERFACES  — src/repositories                                │
│  Pure data-access contracts: PlayerRepository, SchoolRepository, …        │
│  TypeScript interfaces only. No implementation.                           │
└───────────────────────────────┬──────────────────────────────────────────┘
                                 │ implemented by
            ┌────────────────────┴─────────────────────┐
            ▼                                           ▼
┌───────────────────────────┐            ┌───────────────────────────────────┐
│  MockAdapter (Phase 1)    │            │  FirestoreAdapter (Phase 2)       │
│  src/adapters/mock        │            │  src/adapters/firestore           │
│  Reads src/lib/mock-data  │            │  Firestore SDK + Firebase Auth    │
│  in-memory seed.          │            │  (the ONLY Firebase-aware code)   │
└───────────────────────────┘            └───────────────────────────────────┘
            ▲                                           ▲
            └──────────────── selected by ─────────────┘
                    src/lib/di.ts  (single swap point)
```

**Why this shape.** The portal market moves in 48-hour cycles; we must ship a believable Phase-1 product fast and then swap in Firebase without touching feature code. The repository boundary makes that swap a one-file change. The service layer keeps football logic (scheme-fit math, need scoring, board-stage rules) testable in isolation (Phase 3) with mock repositories.

---

## 2. Folder Structure

```
src/
├── app/          # Next.js App Router: routes, layouts, Server Components, route handlers
├── components/   # Shared, domain-agnostic UI primitives (Button, Card, Badge, Table…)
├── features/     # Feature modules — one folder per product capability
├── services/     # Business logic & orchestration; repo-agnostic
├── repositories/ # Repository INTERFACES only (the data-access contracts)
├── adapters/     # Concrete repos: adapters/mock (Phase 1), adapters/firestore (Phase 2)
├── lib/          # di.ts, mock seed data, queryClient, firebase init, utils
├── types/        # Domain types & Zod schemas (single source of truth)
└── ai/           # AI provider abstraction + mock/real implementations
```

| Dir | Responsibility | Example files |
|---|---|---|
| `app/` | URL → page mapping, layouts, Server Components that fetch initial data, route handlers for AI endpoints. **No business logic.** | `app/portal/page.tsx`, `app/players/[id]/page.tsx`, `app/board/page.tsx`, `app/api/ai/route.ts`, `app/layout.tsx` |
| `components/` | Reusable, non-football UI primitives and patterns. Theming via Tailwind. | `Button.tsx`, `Card.tsx`, `Badge.tsx`, `DataTable.tsx`, `EmptyState.tsx`, `ErrorBoundary.tsx`, `Skeleton.tsx` |
| `features/` | Self-contained product capabilities. Each owns its `components/`, `hooks/`, and local `types`. | see mapping below |
| `services/` | Football business logic, orchestration, composition over repositories. | `fit-score.service.ts`, `team-needs.service.ts`, `board.service.ts`, `search.service.ts` |
| `repositories/` | Interfaces only — the seam the rest of the app codes against. | `player.repository.ts`, `school.repository.ts`, `recruiting-board.repository.ts`, … |
| `adapters/` | Concrete implementations of repository interfaces. | `adapters/mock/*.ts`, `adapters/firestore/*.ts`, `adapters/firestore/converters.ts` |
| `lib/` | Cross-cutting infra. **The DI swap point lives here.** | `di.ts`, `mock-data/`, `queryClient.ts`, `firebase.ts`, `utils.ts` |
| `types/` | Domain types derived from Zod schemas (`z.infer`). | `player.ts`, `school.ts`, `evaluation.ts`, `board.ts`, `team-needs.ts`, `ai.ts` |
| `ai/` | Provider-abstracted AI: prompt building, response parsing, mock + real providers. | `ai-provider.ts`, `providers/mock.ts`, `providers/anthropic.ts`, `scouting-report.ts` |

### Feature mapping (`src/features`)

| Product capability | Feature folder | Notes |
|---|---|---|
| Transfer portal search | `features/transfer-portal` | Filter/sort 300+ entrants; the firehose triage view |
| Player profile / evaluation / compare | `features/player-profile` | Per-player fit grade, eligibility, production, side-by-side compare |
| Recruiting board (kanban) | `features/recruiting-board` | Drag-and-drop stages; shared source of truth |
| Team needs / roster analysis | `features/team-needs` | Need-score per position, two-deep gaps |
| Reports (AI scouting) | `features/reports` | Generated scouting reports; export views |
| AI assistant | `features/ai-assistant` | NL Q&A over portal + roster |
| Dashboard | `features/dashboard` | Daily priority action list, KPIs, "what changed" |
| Settings | `features/settings` | Program scheme config, staff roles, board config |

Each feature folder looks like:

```
features/transfer-portal/
├── components/        # PortalTable, PortalFilters, EntrantRow…
├── hooks/             # usePortalSearch, usePlayer…
└── types.ts           # view-model types local to this feature (optional)
```

---

## 3. The Repository Pattern — Interfaces

Repositories are **pure data access**: list / get / query / create / update / delete plus first-class domain queries. They contain **no business logic** (no scoring, no stage rules). All interfaces live in `src/repositories`. Domain entity types come from `src/types` (Zod-inferred, §8).

```ts
// src/repositories/base.repository.ts
export interface ReadRepository<T, ID = string> {
  list(): Promise<T[]>;
  get(id: ID): Promise<T | null>;
}

export interface WriteRepository<T, ID = string> {
  create(input: Omit<T, "id">): Promise<T>;
  update(id: ID, patch: Partial<Omit<T, "id">>): Promise<T>;
  delete(id: ID): Promise<void>;
}

export interface CrudRepository<T, ID = string>
  extends ReadRepository<T, ID>,
    WriteRepository<T, ID> {}
```

```ts
// src/repositories/player.repository.ts
import type { Player, PlayerFilters, PortalStatus } from "@/types/player";

export interface PlayerRepository extends CrudRepository<Player> {
  /** Composed filter/sort over the portal (position, conference, eligibility, status, fit…). */
  queryPlayers(filters: PlayerFilters): Promise<Player[]>;
  listByPosition(positionCode: string): Promise<Player[]>;
  listByPortalStatus(status: PortalStatus): Promise<Player[]>;
  getMany(ids: string[]): Promise<Player[]>;
}
```

```ts
// src/repositories/school.repository.ts
import type { School, Conference } from "@/types/school";

export interface SchoolRepository extends ReadRepository<School> {
  listByConference(conference: Conference): Promise<School[]>;
}
```

```ts
// src/repositories/evaluation.repository.ts
import type { Evaluation, EvaluationStage } from "@/types/evaluation";

export interface EvaluationRepository extends CrudRepository<Evaluation> {
  listByPlayer(playerId: string): Promise<Evaluation[]>;
  listByEvaluator(evaluatorId: string): Promise<Evaluation[]>;
  listByStage(stage: EvaluationStage): Promise<Evaluation[]>;
}
```

```ts
// src/repositories/scouting-report.repository.ts
import type { ScoutingReport } from "@/types/scouting-report";

export interface ScoutingReportRepository extends CrudRepository<ScoutingReport> {
  listByPlayer(playerId: string): Promise<ScoutingReport[]>;
  getLatestForPlayer(playerId: string): Promise<ScoutingReport | null>;
}
```

```ts
// src/repositories/recruiting-board.repository.ts
import type { Board, BoardEntry, BoardStage } from "@/types/board";

export interface RecruitingBoardRepository {
  getBoard(boardId: string): Promise<Board | null>;
  listBoards(orgId: string): Promise<Board[]>;
  listEntries(boardId: string): Promise<BoardEntry[]>;
  addEntry(boardId: string, input: Omit<BoardEntry, "id">): Promise<BoardEntry>;
  updateEntry(entryId: string, patch: Partial<BoardEntry>): Promise<BoardEntry>;
  /** Move a prospect to a new stage (data write only; rules enforced in the service). */
  moveEntryStage(entryId: string, stage: BoardStage, rank: number): Promise<BoardEntry>;
  removeEntry(entryId: string): Promise<void>;
}
```

```ts
// src/repositories/team-needs.repository.ts
import type { PositionNeed, DepthChart } from "@/types/team-needs";

export interface TeamNeedsRepository {
  getDepthChart(orgId: string): Promise<DepthChart>;
  listPositionNeeds(orgId: string): Promise<PositionNeed[]>;
  upsertPositionNeed(orgId: string, need: PositionNeed): Promise<PositionNeed>;
}
```

```ts
// src/repositories/roster.repository.ts
import type { RosterSlot } from "@/types/team-needs";

export interface RosterRepository extends CrudRepository<RosterSlot> {
  listByOrg(orgId: string): Promise<RosterSlot[]>;
  listByPosition(orgId: string, positionCode: string): Promise<RosterSlot[]>;
}
```

```ts
// src/repositories/watchlist.repository.ts
import type { WatchlistEntry } from "@/types/board";

export interface WatchlistRepository {
  listForUser(userId: string): Promise<WatchlistEntry[]>;
  add(userId: string, playerId: string): Promise<WatchlistEntry>;
  remove(userId: string, playerId: string): Promise<void>;
  isWatched(userId: string, playerId: string): Promise<boolean>;
}
```

```ts
// src/repositories/ai-insight.repository.ts
import type { AIInsight, AIInsightKind } from "@/types/ai";

export interface AIInsightRepository extends CrudRepository<AIInsight> {
  listByPlayer(playerId: string): Promise<AIInsight[]>;
  listByKind(kind: AIInsightKind): Promise<AIInsight[]>;
}
```

```ts
// src/repositories/user.repository.ts
import type { User, StaffRole } from "@/types/user";

export interface UserRepository extends CrudRepository<User> {
  getByEmail(email: string): Promise<User | null>;
  listByOrg(orgId: string): Promise<User[]>;
  listByRole(orgId: string, role: StaffRole): Promise<User[]>;
}
```

```ts
// src/repositories/organization.repository.ts
import type { Organization } from "@/types/user";

export interface OrganizationRepository extends ReadRepository<Organization> {
  getByOrgId(orgId: string): Promise<Organization | null>;
}
```

---

## 4. Adapters

Both adapters implement the **same interfaces** from §3. Feature/service code cannot tell them apart.

### MockAdapter (Phase 1)

Reads from in-memory seed data in `src/lib/mock-data/` (300+ players across the Big Ten, SEC, ACC, Big 12, and G5). Filtering/sorting happens in JS over arrays. Writes mutate an in-memory store (optionally persisted to `localStorage` so a session survives reloads). It is synchronous under the hood but returns `Promise`s so the interface matches Firestore exactly.

```ts
// src/adapters/mock/player.adapter.ts
import type { PlayerRepository } from "@/repositories/player.repository";
import type { Player, PlayerFilters } from "@/types/player";
import { players as seed } from "@/lib/mock-data/players";
import { applyPlayerFilters } from "@/lib/mock-data/query";

export class MockPlayerRepository implements PlayerRepository {
  private store = new Map<string, Player>(seed.map((p) => [p.id, p]));

  async list() { return [...this.store.values()]; }
  async get(id: string) { return this.store.get(id) ?? null; }
  async getMany(ids: string[]) {
    return ids.map((id) => this.store.get(id)).filter(Boolean) as Player[];
  }
  async queryPlayers(filters: PlayerFilters) {
    return applyPlayerFilters([...this.store.values()], filters);
  }
  async listByPosition(code: string) {
    return [...this.store.values()].filter((p) => p.primaryPosition === code);
  }
  async listByPortalStatus(status: Player["portalStatus"]) {
    return [...this.store.values()].filter((p) => p.portalStatus === status);
  }
  async create(input: Omit<Player, "id">) {
    const player = { ...input, id: crypto.randomUUID() } as Player;
    this.store.set(player.id, player);
    return player;
  }
  async update(id: string, patch: Partial<Player>) {
    const next = { ...this.store.get(id)!, ...patch } as Player;
    this.store.set(id, next);
    return next;
  }
  async delete(id: string) { this.store.delete(id); }
}
```

### FirestoreAdapter (Phase 2)

Talks to **Firestore** and **Firebase Auth** — the only Firebase-aware code in the app. Uses Firestore **converters** to map documents to Zod-validated domain types, `query(... where(), orderBy())` for `queryPlayers`, and real `id`s from document refs.

```ts
// src/adapters/firestore/player.adapter.ts
import { collection, doc, getDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { playerConverter } from "@/adapters/firestore/converters";
import type { PlayerRepository } from "@/repositories/player.repository";
import type { Player, PlayerFilters } from "@/types/player";

const col = collection(db, "players").withConverter(playerConverter);

export class FirestorePlayerRepository implements PlayerRepository {
  async list() { return (await getDocs(col)).docs.map((d) => d.data()); }
  async get(id: string) {
    const snap = await getDoc(doc(col, id));
    return snap.exists() ? snap.data() : null;
  }
  async queryPlayers(f: PlayerFilters) {
    const clauses = [];
    if (f.position) clauses.push(where("primaryPosition", "==", f.position));
    if (f.conference) clauses.push(where("conference", "==", f.conference));
    if (f.portalStatus) clauses.push(where("portalStatus", "==", f.portalStatus));
    const q = query(col, ...clauses, orderBy("fitScore", "desc"));
    return (await getDocs(q)).docs.map((d) => d.data());
    // Filters Firestore can't express (e.g. ranges) are applied in JS post-fetch.
  }
  // get/getMany/create/update/delete … identical signatures, Firestore writes inside.
}
```

The `playerConverter` runs the Zod schema in `fromFirestore`, so **invalid documents are caught at the adapter boundary** (§8). Real-time board collaboration (Phase 2) uses `onSnapshot` inside the Firestore board adapter, surfaced to hooks via React Query cache updates — still behind the same interface.

---

## 5. Service Layer

Services hold the **football business logic** that repositories deliberately lack. Repositories answer "give me the data"; services answer "what does it mean and what should change." Services receive repositories from the DI container, compose multiple reads, run domain math, enforce rules, and return view-ready results.

What lives here:

- **Fit-score orchestration** — pull player stats + program scheme config, run the per-position fit profile (trait weights × measurable ranges, §7 of the domain bible), produce a sortable `SchemeFitScore`. The *formula* is a service concern; the inputs come from repositories.
- **Board stage transitions** — enforce legal/role-gated moves (only Head Coach → `OFFER_EXTENDED`), write `stageHistory`, then call `recruitingBoard.moveEntryStage`.
- **Team-need analysis** — `projectedReturning = roster − departures + commits`; `needScore = weight × max(0, idealDepth − projectedReturning)`, quality-adjusted. Reads roster + depth chart, writes `PositionNeed`s.
- **Search/filter composition** — translate UI filter state into `PlayerFilters`, blend in fit and need context, and sort. Keeps `queryPlayers` repositories dumb.

```ts
// src/services/fit-score.service.ts
export class FitScoreService {
  constructor(
    private players: PlayerRepository,
    private orgs: OrganizationRepository,
  ) {}
  async scoreForProgram(playerId: string, orgId: string): Promise<SchemeFitScore> { /* … */ }
}

// src/services/board.service.ts
export class BoardService {
  constructor(private board: RecruitingBoardRepository, private users: UserRepository) {}
  async moveStage(entryId: string, stage: BoardStage, actor: User): Promise<BoardEntry> {
    assertCanTransition(actor.role, stage); // role-gated business rule
    /* … append stageHistory, then delegate to repo … */
  }
}

// src/services/team-needs.service.ts
export class TeamNeedsService {
  constructor(private roster: RosterRepository, private needs: TeamNeedsRepository) {}
  async computeNeeds(orgId: string): Promise<PositionNeed[]> { /* need-score math */ }
}

// src/services/search.service.ts
export class SearchService {
  constructor(private players: PlayerRepository) {}
  async searchPortal(filters: PlayerFilters): Promise<Player[]> { /* compose + sort */ }
}
```

---

## 6. Dependency Injection — `src/lib/di.ts`

The **single swap point.** A registry constructs concrete adapters once and wires them into services. Everything upstream imports from `di.ts` (or service factories), never from `adapters/*`. Flipping `DATA_BACKEND` from `"mock"` to `"firestore"` is the **entire** Phase-1 → Phase-2 data migration at the app layer.

```ts
// src/lib/di.ts
import type { PlayerRepository } from "@/repositories/player.repository";
import type { RecruitingBoardRepository } from "@/repositories/recruiting-board.repository";
import type { OrganizationRepository } from "@/repositories/organization.repository";
// … other repository interfaces

import { MockPlayerRepository } from "@/adapters/mock/player.adapter";
import { MockBoardRepository } from "@/adapters/mock/board.adapter";
// … other mock adapters

import { FitScoreService } from "@/services/fit-score.service";
import { BoardService } from "@/services/board.service";
import { TeamNeedsService } from "@/services/team-needs.service";
import { SearchService } from "@/services/search.service";

type Backend = "mock" | "firestore";
const BACKEND: Backend = (process.env.NEXT_PUBLIC_DATA_BACKEND as Backend) ?? "mock";

interface Repositories {
  players: PlayerRepository;
  board: RecruitingBoardRepository;
  orgs: OrganizationRepository;
  // … evaluations, scoutingReports, teamNeeds, roster, watchlist, aiInsights, users, schools
}

function buildRepositories(): Repositories {
  if (BACKEND === "firestore") {
    // Lazy require keeps Firebase out of the Phase-1 bundle entirely.
    const f = require("@/adapters/firestore");
    return {
      players: new f.FirestorePlayerRepository(),
      board: new f.FirestoreBoardRepository(),
      orgs: new f.FirestoreOrganizationRepository(),
      // …
    };
  }
  return {
    players: new MockPlayerRepository(),
    board: new MockBoardRepository(),
    orgs: new MockOrganizationRepository(),
    // …
  };
}

// Singletons — built once per runtime.
const repos = buildRepositories();

export const container = {
  repos,
  services: {
    fitScore: new FitScoreService(repos.players, repos.orgs),
    board: new BoardService(repos.board, repos.users),
    teamNeeds: new TeamNeedsService(repos.roster, repos.teamNeeds),
    search: new SearchService(repos.players),
  },
};

// Convenience accessors hooks/services call.
export const getServices = () => container.services;
export const getRepositories = () => container.repos;
```

> Nothing in `app/`, `features/`, `components/`, `services/`, or `repositories/` imports from `adapters/*`. Only `di.ts` does. That is the invariant a lint rule (or code review) should protect.

---

## 7. Data-Fetching Strategy (React Query)

**Hooks are the only consumers of services.** A hook calls a service method from `getServices()` (or a repository for trivial reads) and wraps it in React Query.

- **Query keys** are structured and centralized so invalidation is precise:
  ```ts
  export const qk = {
    players: { all: ["players"] as const,
               list: (f: PlayerFilters) => ["players", "list", f] as const,
               detail: (id: string) => ["players", "detail", id] as const },
    board:   { entries: (boardId: string) => ["board", boardId, "entries"] as const },
    needs:   { byOrg: (orgId: string) => ["needs", orgId] as const },
  };
  ```
- **Caching.** Portal lists use a short `staleTime` (windows move fast); reference data (schools, scheme config) uses a long `staleTime`. Mutations (`moveStage`, `addEntry`) call `queryClient.invalidateQueries` on the affected keys; board moves use **optimistic updates** for snappy drag-and-drop.

```ts
// src/features/transfer-portal/hooks/usePortalSearch.ts
export function usePortalSearch(filters: PlayerFilters) {
  return useQuery({
    queryKey: qk.players.list(filters),
    queryFn: () => getServices().search.searchPortal(filters),
    staleTime: 30_000,
  });
}
```

- **Server vs. Client Components.** Server Components (in `app/`) handle **initial, SEO-irrelevant-but-fast** loads — a page can `await getServices().search.searchPortal(...)` directly on the server and pass data down, or prefetch into a `dehydrate`d React Query cache. **Client Components** own anything interactive: filter panels, kanban drag, the AI assistant, live updates. Both call the *same* services, so the data path is identical regardless of where it runs.

---

## 8. Validation Strategy (Zod)

**Zod schemas in `src/types` are the single source of truth.** Domain types are derived, never hand-written:

```ts
// src/types/player.ts
import { z } from "zod";

export const PortalStatus = z.enum(["IN_PORTAL", "COMMITTED", "WITHDRAWN", "ENROLLED"]);

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  primaryPosition: z.string(),
  secondaryPositions: z.array(z.string()).default([]),
  conference: z.string(),
  yearsRemaining: z.number().int().min(0).max(5),
  portalStatus: PortalStatus,
  fitScore: z.number().min(0).max(100).optional(),
  // measurables, eligibility, season stats…
});

export type Player = z.infer<typeof PlayerSchema>;
export type PortalStatus = z.infer<typeof PortalStatus>;

export const PlayerFiltersSchema = z.object({
  position: z.string().optional(),
  conference: z.string().optional(),
  portalStatus: PortalStatus.optional(),
  minYearsRemaining: z.number().optional(),
});
export type PlayerFilters = z.infer<typeof PlayerFiltersSchema>;
```

**Where validation runs:**
1. **Adapter boundaries** — the Firestore converter's `fromFirestore` runs `PlayerSchema.parse(...)`, so untrusted/legacy documents never enter the app as malformed types. The Mock adapter validates its seed at module load.
2. **Form input** — settings, manual player edits, and evaluation entry use the same schemas (`zodResolver` with React Hook Form), guaranteeing UI input and stored data share one definition.
3. **AI route handlers** — request and parsed-LLM-response payloads are Zod-validated before becoming `AIInsight`s.

One schema, three checkpoints, zero type drift.

---

## 9. AI Integration Boundary (`src/ai`)

AI is **provider-abstracted** and respects the layering: features never call an LLM SDK directly. They call a service (or hook) that depends on an `AIProvider` interface; the concrete provider is selected like any other dependency.

```ts
// src/ai/ai-provider.ts
export interface AIProvider {
  generateScoutingReport(input: ScoutingReportInput): Promise<ScoutingReportOutput>;
  answerPortalQuestion(input: AssistantQuery): Promise<AssistantAnswer>;
}
```

- **Phase 1** → `MockAIProvider` returns deterministic, football-literate canned responses grounded in the same mock player data — proving the UX without a network call or API key.
- **Phase 2/3** → `AnthropicAIProvider` calls a real LLM. Per the product's AI direction, real providers **default to the latest Claude models (e.g., Opus 4.8)** behind this same interface. The model id is config, not code sprinkled through features.

```ts
// src/ai/index.ts
const AI_BACKEND = process.env.NEXT_PUBLIC_AI_BACKEND ?? "mock";
export const aiProvider: AIProvider =
  AI_BACKEND === "anthropic" ? new AnthropicAIProvider() : new MockAIProvider();
```

Generated outputs are **persisted as data** via `AIInsightRepository` / `ScoutingReportRepository`, so AI results flow through the *same* repository/adapter chain as everything else — never a side channel. Real LLM calls run **server-side only** (route handlers in `app/api/ai/`), keeping keys off the client and honoring the "every AI output is sourced and grounded in structured player data" trust requirement.

---

## 10. State Management

- **React Query owns all server state** — players, boards, evaluations, needs, AI insights. Caching, refetch, optimistic updates, and invalidation are its job. This covers the overwhelming majority of state.
- **Zustand is reserved for ephemeral, client-only UI state** that is awkward to thread through props and has nothing to do with the server:
  - in-flight **kanban drag** state (which card is lifted, the live column hover target) before a move is committed,
  - the **filter panel** open/closed + draft filter values before they're applied to a query,
  - transient compare-tray selection (which players are pinned for side-by-side).

**Why minimal Zustand.** Putting server data in a client store would duplicate React Query's cache and reintroduce the staleness/sync bugs the architecture exists to avoid. Zustand earns its place only where state is genuinely local, fast-changing, and never persisted — drag and filter drafts. Everything else stays in React Query.

---

## 11. Error Handling, Loading & Empty States, Shared Primitives

- **Shared UI primitives live in `src/components`**: `Skeleton`, `EmptyState`, `ErrorBoundary`, `ErrorState`, `Spinner`, plus `Button`/`Card`/`Badge`/`DataTable`. Features compose these so loading/empty/error UX is consistent across the portal table, the board, and reports.
- **Loading.** Every React Query consumer renders a `Skeleton`/`Spinner` on `isLoading`. Server Components use route-level `loading.tsx` for first paint.
- **Empty states.** First-class, not afterthoughts: "No entrants match these filters," "Board has no prospects yet — add from the portal," "No roster gaps at this position." This matters for a tool whose value is *coverage* — an empty list must clearly mean "nothing matched," never "something broke."
- **Errors.** Services translate adapter failures into typed domain errors; hooks surface `isError`/`error`; `app/error.tsx` and component-level `ErrorBoundary` catch render failures. AI failures degrade gracefully ("couldn't generate a report — retry") rather than blocking the page, honoring the hallucination/uncertainty-flagging principle from the product risks.

---

## 12. Build & Run Notes

**This machine has no system Node.** A local Node 20 runtime is vendored at:

```
.localnode/node-v20.18.0-darwin-arm64/bin
```

Prepend it to `PATH` for any Node/npm command:

```bash
export PATH="$PWD/.localnode/node-v20.18.0-darwin-arm64/bin:$PATH"
node -v        # v20.18.0
npm install
npm run dev    # Next.js App Router dev server
```

- **Phase 1 (now):** `NEXT_PUBLIC_DATA_BACKEND=mock`, `NEXT_PUBLIC_AI_BACKEND=mock`. No Firebase project, no API keys required to run the full product.
- **Phase 2:** set `NEXT_PUBLIC_DATA_BACKEND=firestore`, add Firebase config to `src/lib/firebase.ts` (env-driven), implement `src/adapters/firestore/*`. **No feature, hook, service, or repository-interface code changes** — the swap is `di.ts` + the new adapters.
- **Phase 3:** tests target the pure layers first — services with mock repositories, Zod schemas, and the need-score/fit-score math — exactly the seams this architecture was built to make testable.

---

### Architectural invariants (the contract)

1. UI never imports Firebase — only `di.ts` knows the backend.
2. The data path is always UI → Hooks → Services → Repository Interfaces → Adapters.
3. Repositories are pure data access; services hold football logic.
4. Zod schemas in `src/types` are the single source of truth for types.
5. AI is behind `AIProvider`; real calls are server-side and default to the latest Claude models.
