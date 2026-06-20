# PortalIQ — Database & Data-Model Design

**Project:** "Moneyball for Maryland" — NCAA D1 (FBS) College Football Transfer Portal Intelligence Platform
**Scope:** FOOTBALL ONLY.
**Author:** Agent 4 — Database / Data-Model Designer
**Status:** Implementation-ready spec for Zod schemas + mock-data generator (Phase 1), Firestore mapping (Phase 2).

---

## 0. Design Principles

This model is **document-oriented**. Every entity below is intended to round-trip as:

1. A **Zod schema** (`z.object`) + inferred TypeScript type in Phase 1 (mock data, in-memory / JSON).
2. A **Firestore document** in Phase 2, accessed through `src/lib/di.ts` repositories.

Rules of the road:

- **IDs everywhere.** Every document carries a string `id` (the Firestore document ID). References between entities use `<entity>Id` strings (or `<entity>Ids[]` arrays), never embedded foreign documents — except where denormalization is explicitly called out.
- **Denormalize hot read paths.** Firestore charges per document read and cannot `JOIN`. Where a UI surface needs a field on every render (e.g. a player's name + position on a board card), we **duplicate** a small "stamp" of the source document and tolerate eventual staleness.
- **Computed fields are service-layer first, cached second.** `fitScore`, `needScore`, `recruitingStatus` are derived. We compute them in the service layer; we **cache** the result on the document (with a `computedAt` timestamp) only when needed for sorting/filtering at the query layer.
- **Timestamps.** All dates are **ISO-8601 strings** in Phase 1 (`2026-06-16T00:00:00.000Z`). In Firestore they map to `Timestamp`; the repository layer converts. Every doc has `createdAt` and `updatedAt`.
- **Soft enums.** Enums are TypeScript string-literal unions / Zod `z.enum`. Stored as plain strings in Firestore. Eligibility is modeled as **data, not hard-coded rules** (per domain bible §6).
- **Multi-tenant.** Everything is scoped to an `Organization` (a program/staff). `orgId` is on nearly every document for security-rule isolation and query filtering.

---

## 1. Shared Enums (single source of truth)

These are referenced by many entities. Define once, import everywhere.

### Position (`PositionCode`)
```
QB, RB, FB, WR, TE, OT, OG, C, EDGE, DT, NT, LB, ILB, OLB, CB, S, NB, K, P, LS, KR, PR
```

### Position Group (`PositionGroup`)
```
QB, RB, WR, TE, OL, DL, LB, DB, ST
```

### Side of ball (`PositionSide`)
```
offense, defense, special
```

| Code | Group | Side |
|---|---|---|
| QB | QB | offense |
| RB, FB | RB | offense |
| WR | WR | offense |
| TE | TE | offense |
| OT, OG, C | OL | offense |
| EDGE, DT, NT | DL | defense |
| LB, ILB, OLB | LB | defense |
| CB, S, NB | DB | defense |
| K, P, LS, KR, PR | ST | special |

### Conference (`Conference`)
Power conferences + Group of Five subdivisions + independent.
```
Big Ten, SEC, ACC, Big 12,          // Power 4
American, Mountain West, Sun Belt,  // Group of Five
MAC, Conference USA,                // Group of Five
Pac-12, Independent                 // remnant / FBS independents
```

### Eligibility Class (`EligibilityClass`)
```
FR, RS-FR, SO, RS-SO, JR, RS-JR, SR, RS-SR, GR
```
(`RS-` = redshirt. `GR` = graduate. "Super-senior" COVID cases surface as `GR` with `extraYears > 0`.)

### Portal Status (`PortalStatus`) — per §1 of the bible
```
IN_PORTAL, COMMITTED, WITHDRAWN, ENROLLED
```

### Board Stage (`BoardStage`) — per §4
```
WATCHING, EVALUATING, CONTACTED, PRIORITY, OFFER_EXTENDED, COMMITTED, LOST
```
(Non-linear transitions allowed. `SIGNED`/`ENROLLED` collapse into a terminal `COMMITTED` for board purposes; enrollment is tracked on the TransferEntry.)

### Evaluation Tier (`EvaluationTier`) — qualitative grade, per §3
```
CHAMPION, STARTER, CONTRIBUTOR, DEVELOPMENTAL, DO_NOT_RECRUIT
```

### Numeric Grade Scale (`gradeScale` discriminator)
```
TIER  (qualitative bucket)
NUM_5 (1.0–5.0, position-normalized)
NUM_99 (60–99, PFF-style)
```

### Scholarship Status (`ScholarshipStatus`)
```
SCHOLARSHIP, PREFERRED_WALK_ON, WALK_ON
```

### Transfer Window (`WindowType`)
```
WINTER, SPRING, EXCEPTION   // EXCEPTION = coach-change / scholarship-pull / grad
```

### Enrollment Timing (`EnrollmentTiming`)
```
MID_YEAR, SUMMER
```

### Recruiting Status (`RecruitingStatus`) — computed, player-level rollup
```
UNEVALUATED, EVALUATING, TARGET, HOT, COMMITTED_TO_US, LOST, OFF_BOARD
```

### Roles & Permissions (`UserRole`) — RACI from §3
```
HEAD_COACH, COORDINATOR, POSITION_COACH, ANALYST, GA, PERSONNEL_DIRECTOR, COMPLIANCE, ADMIN, VIEWER
```

### Offensive / Defensive Scheme (`OffenseScheme`, `DefenseScheme`)
```
Offense:  AIR_RAID, SPREAD, PRO_STYLE, RPO, ZONE_RUN, GAP_POWER
Defense:  FOUR_THREE, THREE_FOUR, MULTIPLE, NICKEL_425, MAN_COVERAGE, ZONE_COVERAGE
```

---

## 2. Entities

### 2.1 Organization

**Purpose.** The top-level tenant: a single football program/staff (e.g. "University of Maryland Football"). Owns all users, boards, evaluations, and configuration (scheme, scholarship limits).

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | Doc ID, e.g. `org_maryland` |
| name | string | ✅ | "University of Maryland" |
| shortName | string | ✅ | "Maryland" |
| schoolId | ref → Schools.id | ✅ | The program's own School doc |
| conference | Conference | ✅ | Default conference context for "needs" math |
| offenseScheme | OffenseScheme | ✅ | Drives offensive fit weights |
| defenseScheme | DefenseScheme | ✅ | Drives defensive fit weights |
| scholarshipLimit | number | ✅ | 85 (legacy) — configurable |
| rosterLimit | number | ✅ | ~105 (new cap) — configurable |
| nilBudget | number | ❌ | Soft cap, USD; salary-cap-like |
| currentSeason | number | ✅ | e.g. 2026 (recruiting cycle year) |
| settings | object | ❌ | Feature flags, default board id |
| createdAt / updatedAt | ISO date | ✅ | |

**Relationships.** 1 Org → N Users, N RecruitingBoards, N Evaluations, N TeamNeeds, 1 RosterSnapshot (latest). References its own School (1:1).

---

### 2.2 User

**Purpose.** A staff member within an organization, with a role that gates permissions (a GA can add notes; only the head coach can move a prospect to `OFFER_EXTENDED`).

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | Firebase Auth UID in Phase 2 |
| orgId | ref → Organizations.id | ✅ | Tenant scope |
| email | string | ✅ | Unique within org |
| displayName | string | ✅ | "Coach Smith" |
| role | UserRole | ✅ | See enum; drives permissions |
| positionGroups | PositionGroup[] | ❌ | Rooms this coach owns (e.g. `["WR"]`) |
| photoUrl | string | ❌ | |
| isActive | boolean | ✅ | Default true |
| lastLoginAt | ISO date | ❌ | |
| createdAt / updatedAt | ISO date | ✅ | |

**Relationships.** N Users → 1 Org. A User is `assignedTo` on BoardEntries and the `evaluatorId` on Evaluations (1:N each).

**Permission matrix (service-layer enforced):**

| Action | Allowed roles |
|---|---|
| View boards | all |
| Add note / surface prospect | ANALYST, GA + above |
| Film grade / Evaluation | POSITION_COACH + above |
| Scheme-fit confirm | COORDINATOR + above |
| Move to OFFER_EXTENDED | HEAD_COACH only |
| Edit org settings / scholarship | ADMIN, HEAD_COACH |

---

### 2.3 School

**Purpose.** Any FBS (or relevant non-FBS) institution — used as the player's current/previous school and as the org's own program. Reference data shared across the platform.

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | `school_<slug>`, e.g. `school_ohio_state` |
| name | string | ✅ | "Ohio State University" |
| mascot | string | ❌ | "Buckeyes" |
| conference | Conference | ✅ | |
| division | enum | ✅ | `FBS \| FCS \| D2 \| D3 \| JUCO \| NAIA` |
| state | string | ✅ | 2-letter, e.g. "OH" |
| logoUrl | string | ❌ | |
| primaryColor | string | ❌ | Hex, for UI chips |
| isPower | boolean | ✅ | Power-4 membership flag (denormalized) |
| createdAt / updatedAt | ISO date | ✅ | |

**Relationships.** Referenced by Player.currentSchoolId, Player.previousSchoolIds[], TransferEntry.fromSchoolId / committedToSchoolId, Organization.schoolId.

---

### 2.4 Player ⭐ (centerpiece)

**Purpose.** The transfer prospect — the canonical record of an athlete. Aggregates identity, measurables, recruiting pedigree, eligibility, and **denormalized rollups** (consensus grade, fitScore, recruitingStatus) for fast board rendering. Heavy production stats and detailed reports are **referenced** in subcollections, not embedded.

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | `player_<slug>` |
| orgId | ref → Organizations.id | ✅ | Owning tenant (players are scouted per-org) |
| firstName | string | ✅ | |
| lastName | string | ✅ | |
| fullName | string | ✅ | Denormalized for search/sort |
| **currentSchoolId** | ref → Schools.id | ✅ | Where they currently play / left |
| currentSchool | SchoolStamp | ✅ | Denormalized `{id,name,conference,logoUrl}` |
| **previousSchoolIds** | ref[] → Schools.id | ❌ | Transfer history (ordered, oldest→newest) |
| **primaryPosition** | PositionCode | ✅ | Centerpiece filter dimension |
| secondaryPositions | PositionCode[] | ❌ | Versatility = recruiting asset (§2) |
| positionGroup | PositionGroup | ✅ | Denormalized from primaryPosition |
| jerseyNumber | number | ❌ | |
| **heightInches** | number | ✅ | Store inches (74 = 6'2"); format in UI |
| **weightLbs** | number | ✅ | |
| handedness | enum | ❌ | `L \| R` (QB throwing arm) |
| hometown | string | ❌ | "Miami, FL" |
| homeState | string | ❌ | 2-letter |
| **stars** | number | ✅ | 2–5 recruiting stars (HS pedigree) |
| **compositeRating** | number | ✅ | 0.7000–1.0000 (247/On3-style) |
| nationalRank | number | ❌ | Original HS national rank |
| positionRank | number | ❌ | HS rank within position |
| **eligibilityClass** | EligibilityClass | ✅ | FR…GR |
| **eligibility** | EligibilityBlock | ✅ | Nested object (below) — the value engine |
| **scholarshipStatus** | ScholarshipStatus | ✅ | |
| portalStatus | PortalStatus | ❌ | Mirror of active TransferEntry.status |
| **fitScore** | number | ❌ | 0–100, **computed/cached** (§4) |
| **needScore** | number | ❌ | 0–100, position need at time of view, cached |
| **recruitingStatus** | RecruitingStatus | ❌ | **computed/cached** rollup |
| **consensusTier** | EvaluationTier | ❌ | Cached rollup of staff Evaluations |
| consensusGrade | number | ❌ | Cached numeric (NUM_99) average |
| awards | string[] | ❌ | "2025 All-Big Ten 1st Team" |
| injuryFlags | string[] | ❌ | "ACL 2024" — medical risk surfacing |
| characterFlags | string[] | ❌ | Off-field notes (restricted view) |
| nilEstimate | number | ❌ | Estimated NIL ask, USD |
| aiInsightId | ref → AIInsights.id | ❌ | Latest AI report (1:1 latest) |
| watchlistIds | ref[] → Watchlists.id | ❌ | Reverse index for fast membership |
| tags | string[] | ❌ | "in-window","visiting","NIL-heavy" |
| computedAt | ISO date | ❌ | When cached scores last recomputed |
| createdAt / updatedAt | ISO date | ✅ | |

**Embedded `EligibilityBlock` (the value engine, §6):**

| Field | Type | Req | Notes |
|---|---|---|---|
| seasonsAllowed | number | ✅ | Default 4 ("4 in 5") |
| seasonsUsed | number | ✅ | |
| redshirtUsed | boolean | ✅ | |
| extraYears | number | ✅ | COVID/waiver grants; default 0 |
| **yearsRemaining** | number | ✅ | **Computed**: `max(0, seasonsAllowed − seasonsUsed) + extraYears` |
| clockExpiresSeason | number | ❌ | Year the 5-yr clock closes |
| isGraduate | boolean | ✅ | Grad-transfer immediate-eligibility flag |

**Embedded `SchoolStamp`** (denormalization pattern reused on boards/entries): `{ id, name, conference, logoUrl }`.

**Embed vs. reference decisions:**

| Data | Decision | Why |
|---|---|---|
| Identity, measurables, stars, eligibility | **Embed** on Player | Needed on every card; small, stable |
| currentSchool stamp | **Embed** (denormalized) | Avoid a read per card; tolerate staleness |
| previousSchools | **Reference** (id[]) | Variable length; resolve on detail view |
| Season stats | **Reference** (subcollection `playerStats`) | Large, multi-season, position-shaped |
| Measurements / combine | **Reference** (subcollection `playerMeasurements`) | Multiple sources/dates |
| Film links | **Reference** (subcollection `filmLinks`) | Many per player |
| Evaluations | **Reference** (top-level, queried by playerId) | Multi-author, permissioned |
| AI report | **Reference** (id) + embed latest summary | Large body referenced; headline cached |
| fitScore / consensusTier | **Cache on Player** | Sort/filter at query layer |

**Relationships.** N Players → 1 Org (scouted set). 1 Player → 1 currentSchool, N previousSchools, N TransferEntries (history), N Evaluations, N ScoutingReports, N BoardEntries (across boards), N PlayerStats, N PlayerMeasurements, N FilmLinks, N AIInsights (latest cached), N Watchlists (membership).

---

### 2.5 TransferEntry (portal entry)

**Purpose.** A single appearance of a player in the NCAA portal during a window — the state machine of availability (`IN_PORTAL → COMMITTED → ENROLLED`, or `→ WITHDRAWN`). A player can have multiple over a career (multi-transfer era).

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | |
| orgId | ref → Organizations.id | ✅ | |
| playerId | ref → Players.id | ✅ | |
| fromSchoolId | ref → Schools.id | ✅ | School they left |
| **status** | PortalStatus | ✅ | IN_PORTAL/COMMITTED/WITHDRAWN/ENROLLED |
| windowType | WindowType | ✅ | WINTER/SPRING/EXCEPTION |
| seasonYear | number | ✅ | Cycle (e.g. 2026) |
| enteredAt | ISO date | ✅ | Date name entered portal |
| committedToSchoolId | ref → Schools.id | ❌ | Set when COMMITTED |
| committedAt | ISO date | ❌ | |
| withdrawnAt | ISO date | ❌ | |
| enrolledAt | ISO date | ❌ | |
| enrollmentTiming | EnrollmentTiming | ❌ | MID_YEAR vs SUMMER (highly valued) |
| isGradTransfer | boolean | ✅ | |
| outgoing | boolean | ✅ | True if leaving *our* program (roster math) |
| statusHistory | StatusEvent[] | ❌ | Audit `{status, at, byUserId?}` |
| createdAt / updatedAt | ISO date | ✅ | |

**Relationships.** N TransferEntries → 1 Player, 1 fromSchool, 0..1 committedToSchool. Drives roster departure projections (TeamNeeds) when `outgoing = true`.

---

### 2.6 Evaluation

**Purpose.** One evaluator's grade of one player (per §3 — one per evaluator per player, possibly per stage). The raw grades roll up into the Player's `consensusTier`/`consensusGrade`.

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | |
| orgId | ref → Organizations.id | ✅ | |
| playerId | ref → Players.id | ✅ | |
| evaluatorId | ref → Users.id | ✅ | |
| evaluatorRole | UserRole | ✅ | Denormalized — weight by role |
| stage | enum | ✅ | `SCREEN \| FILM \| ANALYTICS \| MEASURABLES \| SCHEME_FIT \| CHARACTER \| FINAL` |
| gradeScale | enum | ✅ | TIER / NUM_5 / NUM_99 |
| tier | EvaluationTier | ❌ | Required when gradeScale=TIER |
| numericGrade | number | ❌ | Required when gradeScale=NUM_* |
| schemeFitScore | number | ❌ | 0–100, scheme alignment |
| filmReviewed | boolean | ✅ | |
| notes | string | ❌ | Free text |
| facetGrades | object | ❌ | PFF-style `{passBlock, runBlock, coverage, passRush,...}` |
| confidence | enum | ❌ | `LOW \| MED \| HIGH` |
| createdAt / updatedAt | ISO date | ✅ | |

**Relationships.** N Evaluations → 1 Player, 1 evaluator (User). Consensus computed by weighting roles (HEAD_COACH/COORDINATOR > POSITION_COACH > GA).

---

### 2.7 ScoutingReport

**Purpose.** A long-form, narrative human scouting writeup on a player (distinct from a quick Evaluation grade and from an AIInsight). Sections mirror the §3 evaluation pipeline.

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | |
| orgId | ref → Organizations.id | ✅ | |
| playerId | ref → Players.id | ✅ | |
| authorId | ref → Users.id | ✅ | |
| title | string | ✅ | |
| summary | string | ✅ | TL;DR shown on card |
| strengths | string[] | ✅ | |
| weaknesses | string[] | ✅ | |
| schemeFitNotes | string | ❌ | |
| projection | EvaluationTier | ❌ | Author's bottom-line tier |
| comparablePlayer | string | ❌ | "plays like…" |
| body | string | ❌ | Full markdown |
| status | enum | ✅ | `DRAFT \| PUBLISHED` |
| createdAt / updatedAt | ISO date | ✅ | |

**Relationships.** N ScoutingReports → 1 Player, 1 author (User).

---

### 2.8 RecruitingBoard

**Purpose.** The staff's master "big board" — a living, season-scoped artifact organized by position then tier. A container for stages (columns) and entries.

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | |
| orgId | ref → Organizations.id | ✅ | |
| name | string | ✅ | "2026 Winter Portal Board" |
| seasonYear | number | ✅ | |
| windowType | WindowType | ❌ | Optional scope |
| description | string | ❌ | |
| ownerId | ref → Users.id | ✅ | |
| stageIds | ref[] → RecruitingStages.id | ✅ | Ordered columns |
| isDefault | boolean | ✅ | Org's primary board |
| isArchived | boolean | ✅ | |
| entryCount | number | ❌ | Denormalized count |
| createdAt / updatedAt | ISO date | ✅ | |

**Relationships.** N Boards → 1 Org. 1 Board → N RecruitingStages, N BoardEntries.

---

### 2.9 RecruitingStage (board columns/stages)

**Purpose.** A configurable column on a board (e.g. WATCHING, PRIORITY). Decoupled from `BoardStage` enum so staff can rename/reorder, while each maps to a canonical stage for analytics.

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | |
| orgId | ref → Organizations.id | ✅ | |
| boardId | ref → RecruitingBoards.id | ✅ | |
| label | string | ✅ | Display name, e.g. "Top Targets" |
| canonicalStage | BoardStage | ✅ | Maps to enum for rollups |
| order | number | ✅ | Column position (0-based) |
| color | string | ❌ | Hex for column header |
| wipLimit | number | ❌ | Optional max entries (kanban) |
| createdAt / updatedAt | ISO date | ✅ | |

**Relationships.** N Stages → 1 Board. 1 Stage → N BoardEntries.

---

### 2.10 BoardEntry (a player's placement on a board)

**Purpose.** Junction linking a Player to a Board+Stage, carrying placement metadata (tier, rank, owner, flags) and a stage audit trail. The kanban card.

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | |
| orgId | ref → Organizations.id | ✅ | |
| boardId | ref → RecruitingBoards.id | ✅ | |
| stageId | ref → RecruitingStages.id | ✅ | Current column |
| canonicalStage | BoardStage | ✅ | Denormalized for filter |
| playerId | ref → Players.id | ✅ | |
| **playerStamp** | object | ✅ | Denormalized `{fullName, primaryPosition, currentSchool, stars, yearsRemaining, fitScore}` for card render |
| tier | EvaluationTier | ❌ | Bucket within position |
| rank | number | ❌ | Order within position/tier |
| positionColumn | PositionCode | ✅ | Which position lane |
| assignedToId | ref → Users.id | ❌ | Owning recruiter (accountability) |
| flags | string[] | ❌ | "in-window","visit-scheduled","medical" |
| notesCount | number | ❌ | Denormalized thread count |
| stageHistory | StageEvent[] | ❌ | `{stageId, canonicalStage, at, byUserId}` |
| stageChangedAt | ISO date | ✅ | |
| createdAt / updatedAt | ISO date | ✅ | |

**Relationships.** N BoardEntries → 1 Board, 1 Stage, 1 Player, 0..1 assignedTo (User). A Player may appear on multiple boards (1 entry per board).

---

### 2.11 TeamNeeds

**Purpose.** The analytical core: per-position roster-construction analysis with a computed `needScore`. Recomputed from the latest RosterSnapshot + projected departures + incoming commits.

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | e.g. `need_2026_WR` |
| orgId | ref → Organizations.id | ✅ | |
| seasonYear | number | ✅ | |
| position | PositionCode | ✅ | |
| positionGroup | PositionGroup | ✅ | |
| idealDepth | number | ✅ | Scheme target (QB:3, OL:9–10…) |
| currentDepth | number | ✅ | On roster now |
| projectedDepartures | number | ✅ | Seniors + NFL early + outgoing portal + attrition |
| incomingCommits | number | ✅ | HS signees + committed transfers |
| projectedReturning | number | ✅ | `current − departures + incoming` |
| **needScore** | number | ✅ | **Computed/cached** 0–100 (§4) |
| qualityGap | number | ❌ | Starter-caliber shortfall weight |
| priority | enum | ✅ | `CRITICAL \| HIGH \| MEDIUM \| LOW \| NONE` |
| availableScholarships | number | ❌ | limit − committed − returning |
| notes | string | ❌ | |
| computedAt | ISO date | ✅ | |
| createdAt / updatedAt | ISO date | ✅ | |

**Relationships.** N TeamNeeds → 1 Org (one per position per season). Reads from RosterSnapshot; feeds Player.needScore and board prioritization.

---

### 2.12 RosterSnapshot

**Purpose.** A point-in-time capture of the program's full roster by position with depth ranks and eligibility — the input to TeamNeeds and scholarship math. Snapshotted so "needs" are reproducible and historical.

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | `roster_2026_0616` |
| orgId | ref → Organizations.id | ✅ | |
| seasonYear | number | ✅ | |
| asOf | ISO date | ✅ | Snapshot date |
| label | string | ❌ | "Post-Spring 2026" |
| **slots** | RosterSlot[] | ✅ | Embedded array of roster members |
| scholarshipCount | number | ✅ | Counters used |
| rosterCount | number | ✅ | Total bodies |
| scholarshipLimit | number | ✅ | Snapshotted from org config |
| rosterLimit | number | ✅ | |
| createdAt / updatedAt | ISO date | ✅ | |

**Embedded `RosterSlot`:**

| Field | Type | Req | Notes |
|---|---|---|---|
| playerName | string | ✅ | (Roster players need not be Player docs) |
| linkedPlayerId | ref → Players.id | ❌ | If also a prospect record |
| position | PositionCode | ✅ | |
| depthRank | number | ✅ | 1=starter, 2=backup… |
| eligibilityClass | EligibilityClass | ✅ | |
| yearsRemaining | number | ✅ | |
| scholarshipStatus | ScholarshipStatus | ✅ | |
| departureRisk | enum | ✅ | `NONE \| LOW \| MED \| HIGH` (NFL/portal/grad) |

**Relationships.** N RosterSnapshots → 1 Org. Latest snapshot drives all TeamNeeds. Embedded slots (not subcollection) because a snapshot is read/written atomically as a unit.

---

### 2.13 PlayerStats

**Purpose.** Per-season production for a player. Universal columns first-class; position-specific metrics in a flexible bag. Source-tagged (§9).

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | `stats_<playerId>_2025` |
| orgId | ref → Organizations.id | ✅ | |
| playerId | ref → Players.id | ✅ | |
| seasonYear | number | ✅ | |
| schoolId | ref → Schools.id | ✅ | School during that season |
| position | PositionCode | ✅ | |
| gamesPlayed | number | ✅ | |
| gamesStarted | number | ❌ | |
| snaps | number | ❌ | |
| pffOverall | number | ❌ | 0–99 advanced grade |
| **metrics** | object (EAV bag) | ✅ | Position-specific (below) |
| source | string | ✅ | "PFF","247","ourAnalyst" |
| verified | boolean | ✅ | |
| createdAt / updatedAt | ISO date | ✅ | |

**`metrics` bag by position (examples, all `number`):**

| Position | Keys |
|---|---|
| QB | `completions, attempts, completionPct, passYards, passTD, interceptions, yardsPerAttempt, qbRating, sackPct, bigTimeThrowPct, turnoverWorthyPlayPct, rushYards` |
| RB | `rushAttempts, rushYards, yardsPerCarry, rushTD, yardsAfterContact, missedTacklesForced, receptions, recYards, fumbles` |
| WR/TE | `receptions, targets, recYards, yardsPerReception, recTD, dropRate, contestedCatchPct, yardsAfterCatch, separationAvg` |
| OL | `snaps, pressuresAllowed, sacksAllowed, passBlockGrade, runBlockGrade, penalties` |
| EDGE/DT/NT | `sacks, pressures, hurries, qbHits, tacklesForLoss, runStopPct, passRushWinRate` |
| LB | `tackles, tacklesForLoss, missedTacklePct, coverageGrade, runStopPct, blitzPressures` |
| CB/S/NB | `tackles, passBreakups, interceptions, completionPctAllowed, yardsPerCoverageSnap, missedTacklePct, passerRatingAllowed` |
| K/P | `fgMade, fgAttempts, fgPct, longFG, fgPct40plus, touchbackPct, netPuntAvg, puntsInside20, hangTime` |

**Relationships.** N PlayerStats → 1 Player (one per season). Stored as Firestore **subcollection** `players/{id}/playerStats/{season}`.

---

### 2.14 PlayerMeasurements

**Purpose.** Athletic testing & physical measurables from a dated source (combine, pro day, verified testing). Multiple per player (different events/dates).

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | |
| orgId | ref → Organizations.id | ✅ | |
| playerId | ref → Players.id | ✅ | |
| measuredAt | ISO date | ✅ | |
| source | string | ✅ | "Combine","ProDay","HS","verified" |
| heightInches | number | ❌ | |
| weightLbs | number | ❌ | |
| wingspanInches | number | ❌ | |
| armLengthInches | number | ❌ | OL/DL relevant (33"+ for OT) |
| handSizeInches | number | ❌ | |
| fortyYard | number | ❌ | seconds, e.g. 4.45 |
| tenYardSplit | number | ❌ | seconds |
| verticalInches | number | ❌ | |
| broadJumpInches | number | ❌ | |
| threeCone | number | ❌ | seconds |
| shuttle | number | ❌ | seconds (20-yd) |
| benchReps | number | ❌ | |
| verified | boolean | ✅ | |
| createdAt / updatedAt | ISO date | ✅ | |

**Relationships.** N PlayerMeasurements → 1 Player. Subcollection `players/{id}/playerMeasurements/{id}`.

---

### 2.15 FilmLink

**Purpose.** A pointer to evaluation film (cut-ups, All-22, highlight). Core of evaluation (§3).

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | |
| orgId | ref → Organizations.id | ✅ | |
| playerId | ref → Players.id | ✅ | |
| url | string | ✅ | Hudl/YouTube/internal |
| type | enum | ✅ | `CUT_UP \| ALL_22 \| HIGHLIGHT \| GAME \| TV_COPY` |
| title | string | ✅ | "vs Michigan 2025" |
| seasonYear | number | ❌ | |
| opponent | string | ❌ | |
| durationSec | number | ❌ | |
| addedById | ref → Users.id | ❌ | |
| createdAt / updatedAt | ISO date | ✅ | |

**Relationships.** N FilmLinks → 1 Player. Subcollection `players/{id}/filmLinks/{id}`.

---

### 2.16 Watchlist

**Purpose.** A lightweight, user- or staff-owned saved list of players (independent of formal boards) — "players I'm tracking." Many-to-many with players.

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | |
| orgId | ref → Organizations.id | ✅ | |
| ownerId | ref → Users.id | ✅ | |
| name | string | ✅ | "Slot WRs to watch" |
| description | string | ❌ | |
| isShared | boolean | ✅ | Visible to whole staff |
| playerIds | ref[] → Players.id | ✅ | Membership (denormalized both ways) |
| playerCount | number | ❌ | Denormalized |
| createdAt / updatedAt | ISO date | ✅ | |

**Relationships.** N Watchlists → 1 owner (User). M:N with Players (mirrored on `Player.watchlistIds` for fast membership checks).

---

### 2.17 AIInsight

**Purpose.** An AI-generated scouting report / insight on a player — the "Moneyball" output. Stored versioned; the latest summary is cached onto the Player.

| Field | Type | Req | Notes |
|---|---|---|---|
| id | string | ✅ | |
| orgId | ref → Organizations.id | ✅ | |
| playerId | ref → Players.id | ✅ | |
| type | enum | ✅ | `SCOUTING_REPORT \| FIT_ANALYSIS \| COMP \| RISK_FLAG \| SUMMARY` |
| model | string | ✅ | e.g. "claude-opus-4-8" |
| **headline** | string | ✅ | One-liner cached on Player |
| summary | string | ✅ | Short body |
| body | string | ❌ | Full markdown report |
| fitScore | number | ❌ | AI-assessed fit 0–100 |
| confidence | enum | ✅ | `LOW \| MED \| HIGH` |
| strengths | string[] | ❌ | |
| concerns | string[] | ❌ | |
| comparablePlayers | string[] | ❌ | |
| sourceRefs | object[] | ❌ | Which stats/film drove it (provenance) |
| generatedAt | ISO date | ✅ | |
| createdAt / updatedAt | ISO date | ✅ | |

**Relationships.** N AIInsights → 1 Player (versioned). `Player.aiInsightId` points to latest. Subcollection `players/{id}/aiInsights/{id}`.

---

## 3. Entity-Relationship Overview

```
Organization (tenant)
  ├──1:1── School (own program)
  ├──1:N── User ──────────────── assignedTo ─┐
  ├──1:N── RecruitingBoard ─1:N─ RecruitingStage
  │            └──────────────1:N─ BoardEntry ──┐
  ├──1:N── TeamNeeds                            │
  ├──1:N── RosterSnapshot [embeds RosterSlot[]] │
  └──1:N── Player ⭐ ───────────────────────────┘ (placed on boards)
               ├──N:1── School (current)
               ├──N:N── School (previous[])
               ├──1:N── TransferEntry ──N:1── School (from / committedTo)
               ├──1:N── Evaluation ──N:1── User (evaluator)
               ├──1:N── ScoutingReport ──N:1── User (author)
               ├──1:N── PlayerStats        (subcollection)
               ├──1:N── PlayerMeasurements (subcollection)
               ├──1:N── FilmLink           (subcollection)
               ├──1:N── AIInsight          (subcollection)
               └──N:N── Watchlist
```

**Cardinality summary:**

| From | To | Card. | Via |
|---|---|---|---|
| Organization | User | 1:N | orgId |
| Organization | Player | 1:N | orgId |
| Player | School (current) | N:1 | currentSchoolId |
| Player | School (previous) | N:N | previousSchoolIds[] |
| Player | TransferEntry | 1:N | playerId |
| Player | Evaluation | 1:N | playerId |
| Player | BoardEntry | 1:N | playerId |
| Board | RecruitingStage | 1:N | boardId |
| Board | BoardEntry | 1:N | boardId |
| Stage | BoardEntry | 1:N | stageId |
| Player | Watchlist | N:N | playerIds[] / watchlistIds[] |
| Player | PlayerStats/Measurements/FilmLinks/AIInsights | 1:N | subcollections |

---

## 4. Computed / Derived Fields

Computed values are **service-layer functions**; we cache onto documents only the ones we sort/filter by at the query layer (Firestore can only order/range on stored fields).

| Field | Lives on | Where computed | Cached? | Formula sketch |
|---|---|---|---|---|
| `eligibility.yearsRemaining` | Player | service / on write | ✅ (stored) | `max(0, seasonsAllowed − seasonsUsed) + extraYears` |
| `fitScore` | Player (also AIInsight) | service `computeFitScore(player, scheme, position)` | ✅ cached + `computedAt` | weighted blend of measurable-fit vs scheme target ranges, trait weights, production percentile. 0–100 |
| `needScore` | TeamNeeds (mirrored to Player) | service `computeNeedScore(pos, roster)` | ✅ cached | `weight × max(0, idealDepth − projectedReturning)` adjusted by `qualityGap`. 0–100 |
| `recruitingStatus` | Player | service rollup of BoardEntries + Evaluations + portalStatus | ✅ cached | state machine: no evals→`UNEVALUATED`; has evals→`EVALUATING`; PRIORITY/OFFER→`TARGET`/`HOT`; committed→`COMMITTED_TO_US`; LOST→`LOST` |
| `consensusTier` / `consensusGrade` | Player | service weighted avg of Evaluations | ✅ cached | role-weighted mean of grades → tier bucket |
| `projectedReturning` | TeamNeeds | service | ✅ stored | `current − projectedDepartures + incomingCommits` |
| Height/weight display ("6'2\"/210") | UI | view formatter | ❌ | derived from `heightInches`/`weightLbs` |
| `daysLeftInWindow` | UI | view, vs TransferWindow | ❌ | `closesAt − now` |

**Recompute triggers:** `fitScore` on player/measurement/stat change or scheme config change; `consensus*` on Evaluation write; `needScore` on RosterSnapshot or TransferEntry(outgoing) change. `computedAt` lets the UI flag staleness.

---

## 5. Firestore Collection Layout (Phase 2)

### Top-level collections
```
/organizations/{orgId}
/schools/{schoolId}                         (global reference data; no orgId)
/users/{userId}                             (orgId field; or subcollection of org)
/players/{playerId}
/transferEntries/{entryId}
/evaluations/{evalId}
/scoutingReports/{reportId}
/recruitingBoards/{boardId}
/recruitingStages/{stageId}
/boardEntries/{entryId}
/teamNeeds/{needId}
/rosterSnapshots/{snapshotId}
/watchlists/{watchlistId}
```

### Subcollections (owned, read with the parent)
```
/players/{playerId}/playerStats/{seasonYear}
/players/{playerId}/playerMeasurements/{measurementId}
/players/{playerId}/filmLinks/{filmId}
/players/{playerId}/aiInsights/{insightId}
/recruitingBoards/{boardId}/  (stages & entries may alternatively nest here)
```

**Top-level vs subcollection rationale:**
- `players`, `evaluations`, `boardEntries`, `transferEntries` are **top-level** so we can run cross-cutting queries (e.g. "all IN_PORTAL WRs across the scouted set", "all evals by coach X").
- `playerStats / measurements / filmLinks / aiInsights` are **subcollections** — always accessed in the context of one player, large, and rarely queried across players.
- `schools` is a **global** collection (shared reference data, no tenant scope).

### Document ID strategy
| Collection | ID strategy |
|---|---|
| organizations | slug: `org_maryland` |
| schools | slug: `school_ohio_state` |
| users | Firebase Auth UID |
| players | slug+disambiguator: `player_jdoe_qb_8421` |
| playerStats | deterministic: `<season>` (within player subcollection) |
| teamNeeds | deterministic: `need_<season>_<POS>` (idempotent recompute) |
| rosterSnapshots | `roster_<season>_<MMDD>` |
| others | Firestore auto-ID |

Deterministic IDs (teamNeeds, playerStats) make recompute **idempotent** (upsert, no dupes).

### Important composite indexes
Firestore requires composite indexes for multi-field queries. The core portal filter is **position + conference + yearsRemaining + rating**, so:

| # | Collection | Fields (in order) | Serves |
|---|---|---|---|
| 1 | players | `orgId ASC, primaryPosition ASC, portalStatus ASC, compositeRating DESC` | "IN_PORTAL QBs ranked by composite" |
| 2 | players | `orgId ASC, primaryPosition ASC, currentSchool.conference ASC, eligibility.yearsRemaining DESC` | position + conference + years-remaining filter |
| 3 | players | `orgId ASC, primaryPosition ASC, eligibility.yearsRemaining DESC, fitScore DESC` | "best multi-year fits at position" |
| 4 | players | `orgId ASC, recruitingStatus ASC, needScore DESC, fitScore DESC` | "hot targets at positions of need" |
| 5 | boardEntries | `boardId ASC, canonicalStage ASC, positionColumn ASC, rank ASC` | render board by column + position lane |
| 6 | evaluations | `orgId ASC, playerId ASC, createdAt DESC` | latest evals for a player |
| 7 | transferEntries | `orgId ASC, status ASC, windowType ASC, enteredAt DESC` | "newest winter-window entries still IN_PORTAL" |

(Single-field `stars`, `eligibilityClass`, `positionGroup` are auto-indexed.)

### Security-rule shape
All tenant docs filter on `orgId == request.auth.token.orgId`. Write of `OFFER_EXTENDED` board stage and org settings further gated by `role` claim (HEAD_COACH/ADMIN). `schools` are world-readable, admin-writable.

---

## 6. Mock-Data Generation Ranges (Phase 1)

Realistic per-position ranges for the generator. Height in inches; format to feet-inches in UI.

### Physical & athletic

| Pos | Height (in) | Weight (lb) | 40-yd (s) | Vertical (in) | Notable |
|---|---|---|---|---|---|
| QB | 72–77 (6'0"–6'5") | 195–235 | 4.55–5.05 | 28–35 | arm/processing |
| RB | 69–73 | 200–225 | 4.40–4.60 | 33–40 | contact balance |
| FB | 72–74 | 235–250 | 4.70–4.95 | 28–33 | blocking |
| WR | 70–76 | 175–215 | 4.35–4.60 | 33–42 | separation |
| TE | 76–79 | 240–260 | 4.55–4.85 | 30–36 | dual-threat |
| OT | 77–80 (6'5"–6'8") | 300–325 | 5.10–5.45 | 24–30 | arm length 33"+ |
| OG | 75–78 | 310–330 | 5.15–5.50 | 23–29 | power/pull |
| C | 74–77 | 295–315 | 5.15–5.50 | 23–29 | snap/IQ |
| EDGE | 75–78 | 250–270 | 4.55–4.85 | 32–38 | bend/get-off |
| DT | 74–77 | 290–310 | 4.85–5.20 | 27–33 | penetration |
| NT | 73–76 | 310–340 | 5.05–5.40 | 24–30 | two-gap mass |
| OLB | 73–76 | 230–250 | 4.50–4.75 | 32–38 | scheme-dependent |
| ILB/LB | 72–75 | 225–245 | 4.55–4.80 | 31–37 | range |
| CB | 70–74 | 185–200 | 4.35–4.55 | 34–42 | hip fluidity |
| S | 71–74 | 195–215 | 4.40–4.60 | 33–40 | range/box |
| NB | 70–72 | 185–200 | 4.40–4.60 | 33–40 | slot |
| K | 70–74 | 180–210 | n/a | n/a | FG range |
| P | 72–76 | 190–220 | n/a | n/a | hang time |
| LS | 72–75 | 225–250 | n/a | n/a | snap speed |

### Recruiting & eligibility (all positions)

| Field | Range / distribution |
|---|---|
| stars | 2–5 (skew: ~50% 3★, 30% 4★, 12% 2★, 8% 5★) |
| compositeRating | 0.7000–1.0000 (2★≈0.70–0.83, 3★≈0.83–0.89, 4★≈0.89–0.97, 5★≈0.97–1.00) |
| nationalRank | 1–1500 |
| positionRank | 1–150 |
| eligibilityClass | weighted FR…GR; portal skews SO/JR/GR |
| seasonsAllowed | 4 (rarely 5 with waiver) |
| seasonsUsed | 0–4 |
| extraYears | 0 (occasional 1 for COVID super-seniors) |
| yearsRemaining | 0–4 (computed) |
| scholarshipStatus | ~80% SCHOLARSHIP, 15% PWO, 5% WALK_ON |
| fitScore | 40–98 |
| needScore | 0–100 |
| nilEstimate | $0–$1.5M (skew low; 5★ portal QBs high) |

### Production stats (season ranges, starter-level)

| Pos | Stat | Range |
|---|---|---|
| QB | passYards | 1500–4200 |
| QB | passTD / INT | 10–42 / 2–16 |
| QB | completionPct | 55–72 |
| QB | yardsPerAttempt | 6.5–10.5 |
| QB | qbRating | 120–185 |
| RB | rushYards | 400–1800 |
| RB | yardsPerCarry | 3.8–6.8 |
| RB | rushTD | 3–22 |
| WR/TE | receptions | 20–95 |
| WR/TE | recYards | 300–1400 |
| WR/TE | recTD | 2–15 |
| WR/TE | dropRate | 2–12% |
| OL | pressuresAllowed | 5–35 |
| OL | passBlockGrade | 55–92 |
| EDGE/DT | sacks | 1–14 |
| EDGE/DT | pressures | 10–55 |
| EDGE/DT | tacklesForLoss | 3–22 |
| LB | tackles | 35–130 |
| LB | tacklesForLoss | 3–18 |
| CB/S | passBreakups | 3–18 |
| CB/S | interceptions | 0–7 |
| CB/S | passerRatingAllowed | 40–115 |
| K | fgPct | 65–92% |
| K | longFG | 38–58 |
| P | netPuntAvg | 38–46 |

### General
- `gamesPlayed`: 0–14; `gamesStarted` ≤ gamesPlayed; `snaps`: 50–900.
- `pffOverall`: 55–92 (starters), 45–60 (developmental).
- Awards: 0–3 sampled from a pool ("All-Conference", "Freshman All-American", "Team Captain").
- portalStatus distribution: ~60% IN_PORTAL, 20% COMMITTED, 12% WITHDRAWN, 8% ENROLLED.
- windowType: ~70% WINTER, 20% SPRING, 10% EXCEPTION.
- Conference distribution weighted toward Power-4 with a Group-of-Five tail.

---

## 7. Implementation Notes

- **Zod first.** Define each entity as `z.object`, infer `type X = z.infer<typeof XSchema>`. Enums via `z.enum([...])` from §1. Nested blocks (`EligibilityBlock`, `RosterSlot`, `SchoolStamp`, `metrics`) as their own schemas, composed in.
- **`metrics` bag** is `z.record(z.string(), z.number())` with a per-position helper validator for known keys (loose, since sources vary).
- **Refs** are `z.string()` branded as `PlayerId`, `SchoolId`, etc. (optional branding via `z.string().brand<'PlayerId'>()`) to prevent ID mixups at compile time.
- **Repositories** (`src/lib/di.ts`) expose `get/list/query/upsert` per entity; Phase 1 backs them with in-memory mock arrays, Phase 2 with Firestore — same interface, so call sites don't change.
- **Denormalized stamps** (`currentSchool`, `playerStamp`) are refreshed by the service layer on the source write; never hand-edited. Treat as a cache.
- **Computed fields** are written only by their compute functions; mark them readonly in the type layer to discourage manual mutation.
