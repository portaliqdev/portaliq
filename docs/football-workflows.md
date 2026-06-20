# Football Recruiting & Transfer Portal Workflows — Domain Bible

**Project:** "Moneyball for Maryland" — NCAA Division I College Football Transfer Portal Intelligence Platform
**Audience:** Engineers and database designers modeling the domain
**Scope:** FOOTBALL ONLY. NCAA FBS transfer-portal recruiting, NIL/portal era.

This document maps real-world college football recruiting workflows with enough fidelity to drive a faithful data model. Throughout, candidate **entities** are noted in `code`, with key **attributes** and **state machines** called out for the database designer.

---

## 1. Transfer Portal Mechanics

The **NCAA Transfer Portal** is a compliance database (not a public website) where a student-athlete's intent to transfer is recorded. It exists to let athletes signal availability and let other schools legally initiate contact.

### Entry process
1. A player informs their current school's compliance/athletics office that they intend to transfer ("Notification of Transfer").
2. The school has a fixed window (currently **2 business days**) to enter the athlete's name into the portal.
3. Once entered, the player is "**in the portal**" and any other school may contact them **without** it being tampering.

### Entry windows (current era)
College football uses **defined transfer windows** rather than year-round entry:
- **Winter window:** Opens early-to-mid December (shortly after conference championship games / bowl selection), runs ~30 days. This is the primary window — the largest volume of FBS transfers.
- **Spring window:** A shorter window in mid-to-late April (after spring practice), ~15 days.
- **Exceptions:** A player whose head coach leaves, or whose scholarship is reduced/not renewed, may enter outside the windows. Graduate transfers and certain bowl-related timing exceptions also exist.

> Data note: model windows as a `TransferWindow` entity (`type`: winter|spring, `opensAt`, `closesAt`, `seasonYear`) so the platform can flag "X days left in window" and prioritize accordingly.

### Eligibility rules (current landscape)
- **Multi-transfer / immediate eligibility:** In the current era, undergraduate transfers are generally **immediately eligible** to play (the old "one-time transfer, sit a year" restriction has effectively collapsed via waivers and litigation). A player transferring is a meaningful eligibility consideration but rarely a hard block.
- **Graduate transfers:** A player who has completed an undergraduate degree may transfer with remaining eligibility; historically the cleanest immediate-eligibility path.
- **Academic eligibility:** Transfer must satisfy academic progress (APR), GPA, and credit-transfer requirements at the new school. A non-trivial recruiting risk.

### Scholarship vs. walk-on
- **Scholarship player:** Counts against the team's scholarship limit. Higher recruiting cost.
- **Walk-on:** Non-scholarship roster member. Preferred walk-ons (PWO) are recruited but unfunded. Portal walk-ons exist and can be high-value if a scholarship can later be offered.

### NIL & tampering reality
- **NIL (Name, Image, Likeness)** collectives and deals are now central to portal recruiting; effectively a salary-cap-like budgeting problem for the staff.
- **Tampering** (contacting a player before they're in the portal) is officially prohibited but widely understood to occur via intermediaries. The platform should NOT facilitate tampering; it should track **legal** contact timing.

### Player portal states (state machine)
Model a `PortalEntry` with status transitions:

| State | Meaning |
|---|---|
| `IN_PORTAL` | Name is in the portal, available, uncommitted |
| `COMMITTED` | Verbally committed to a destination school (still in portal until NLI/enrollment) |
| `WITHDRAWN` | Removed name; returning to original school or no longer transferring |
| `ENROLLED` | Officially enrolled at destination (off the market) |

Track `enteredAt`, `committedTo` (school), `committedAt`, `withdrawnAt`, `windowType`.

---

## 2. Position Taxonomy

Coaches think in **position rooms** (a position coach owns a room) and build a **two-deep depth chart** (starter + backup per spot, often 3-deep at skill positions).

### Offense
| Pos | Abbrev | Group | Body-type / measurable expectations |
|---|---|---|---|
| Quarterback | QB | QB | 6'2"–6'5", arm strength, mobility a plus; processing speed |
| Running Back | RB | RB | 5'9"–6'1", 200–225 lb, 4.4–4.6 forty, contact balance |
| Fullback | FB | RB | 6'0"–6'2", 235–250 lb, blocking + short-yardage |
| Wide Receiver | WR | WR | Varies: X (6'2"+), slot (5'10"–6'0", quick), Z; 4.4–4.5 forty |
| Tight End | TE | TE | 6'4"–6'7", 240–260 lb, dual-threat (block + receive) vs. "move" TE |
| Offensive Tackle | OT | OL | 6'5"–6'8", 300–325 lb, arm length (33"+), pass-set foot speed |
| Offensive Guard | OG | OL | 6'3"–6'6", 310–330 lb, power, pull ability |
| Center | C | OL | 6'2"–6'5", 295–315 lb, snap reliability, line-call IQ |

### Defense
| Pos | Abbrev | Group | Body-type / measurable expectations |
|---|---|---|---|
| Edge / Defensive End | EDGE/DE | DL | 6'3"–6'6", 250–270 lb, get-off, bend, pass-rush |
| Defensive Tackle | DT | DL | 6'2"–6'5", 290–310 lb, anchor, gap penetration |
| Nose Tackle | NT | DL | 6'1"–6'4", 310–340 lb, two-gap, block occupation |
| Outside Linebacker | OLB | LB | 6'1"–6'4", 230–250 lb (scheme-dependent: edge vs. coverage) |
| Inside/Middle Linebacker | ILB/MLB | LB | 6'0"–6'3", 225–245 lb, range, tackling, communication |
| Cornerback | CB | DB | 5'10"–6'2", 185–200 lb, 4.4 speed, hip fluidity, length |
| Safety (Free/Strong) | S/FS/SS | DB | 5'11"–6'2", 195–215 lb; FS range/coverage, SS box/run support |
| Nickelback | NB | DB | 5'10"–6'0", 185–200 lb, slot coverage + blitz |

### Special Teams
| Pos | Abbrev | Notes |
|---|---|---|
| Kicker | K | FG range, accuracy, kickoff leg |
| Punter | P | Hang time, net average, directional |
| Long Snapper | LS | Snap speed/accuracy; specialist scholarship occasionally |
| Kick/Punt Returner | KR/PR | Usually a WR/RB/DB; explosiveness, ball security |

> Data note: model `Position` with `code`, `name`, `group` (OL/DL/LB/DB/QB/RB/WR/TE/ST), and `side` (offense/defense/special). A `Player` may have a `primaryPosition` and `secondaryPositions[]` (positional versatility is a real recruiting asset). Allow position-level **measurable thresholds** as configurable scheme criteria.

---

## 3. Evaluation Workflow

A staff evaluates a transfer through a pipeline. Each stage adds confidence and narrows the pool.

1. **Initial screen** — Analyst/GA surfaces the player from portal feeds, filters by position need, eligibility remaining, and basic production. Quick yes/no/maybe.
2. **Film study** — The core of evaluation. Position coach studies:
   - **Cut-ups** (every snap of a player, edited by play type)
   - **All-22 / coaches film** (shows all 22 players, reveals assignments, leverage, technique)
   - Looks for traits that translate: footwork, hands, processing, effort, finish.
3. **Analytics / stats** — Production stats + advanced grades (PFF-style). Snap counts, efficiency, situational splits (3rd down, red zone).
4. **Measurables / athletic testing** — Height, weight, wingspan, forty, vertical, shuttle. From combines, pro days, verified testing, or prior recruiting data.
5. **Scheme fit** — Does the player's skill set match the offensive/defensive scheme? (See §7.)
6. **Character / academics / medical** — Background, locker-room fit, academic transferability, injury history. Often where good players get crossed off.
7. **Grade** — Position coach assigns a **positional grade**; coordinator confirms; head coach approves a final disposition.

### Grading scale
Two common models — support both:

**Tiered (qualitative):**
| Tier | Meaning |
|---|---|
| Champion / Blue | Difference-maker, instant impact, all-conference ceiling |
| Starter | Projects as a Day 1 starter |
| Contributor | Rotational / depth + special teams |
| Developmental | Upside, needs a year, redshirt-type |
| Do Not Recruit | Off the board |

**Numeric:** e.g., a position-normalized scale (60–99, or 1.0–5.0). Useful for sorting and "need score" math.

### Roles (RACI-style)
| Action | Owner |
|---|---|
| Surface prospect | Analyst / Graduate Assistant |
| Film grade | Position Coach |
| Scheme-fit confirm | Coordinator (OC/DC) |
| Final approval / offer authority | Head Coach |
| Compliance / eligibility check | Football Ops / Compliance |
| NIL/budget fit | Director of Player Personnel / GM |

> Data note: model `Evaluation` (one per evaluator per player) with `evaluatorId`, `stage`, `grade`, `gradeScale`, `notes`, `filmReviewed` (bool), `createdAt`. A `Player` rolls up a **consensus/staff grade** plus individual evaluations. Track `evaluationStatus` as a per-player stage enum.

---

## 4. Recruiting Board Workflow

The **big board** is the staff's master, living artifact — organized **by position**, then by **tier** within each position.

### Structure
- Columns/groups by `Position`.
- Within a position, players are ranked and tier-bucketed (Champion → Developmental).
- A **position need indicator** sits atop each position column (see §5).

### Prospect stage (state machine)
A prospect moves through stages on the board:

| Stage | Meaning |
|---|---|
| `WATCHING` | Identified, not yet evaluated |
| `EVALUATING` | Under active film/analytics review |
| `CONTACTED` | Staff has made legal contact |
| `PRIORITY` | High-priority target, resources committed |
| `OFFER_EXTENDED` | Scholarship offer made |
| `COMMITTED` | Player has committed to us |
| `SIGNED` / `ENROLLED` | NLI signed / on campus |
| `LOST` | Committed/signed elsewhere or no longer pursued |

> Allow non-linear transitions (a player can jump WATCHING → PRIORITY). Track `stage`, `stageChangedAt`, and a `stageHistory[]` audit trail.

### Collaboration
- Multiple staff view/edit the same board; **role-based permissions** matter (a GA can add notes; only the head coach can move a prospect to `OFFER_EXTENDED`).
- **Comments/notes** thread per prospect.
- **Assignment**: each prospect has an owning recruiter (`assignedTo`) for accountability.
- **Tags/flags**: e.g., "in-window," "visiting this weekend," "NIL-heavy," "medical flag."

> Data note: `BoardEntry` linking `Player` ↔ `Board` with `stage`, `tier`, `rank`, `assignedTo`, `flags[]`. Boards may be season-scoped.

---

## 5. Position-Need & Roster-Construction Analysis

The platform's analytical core: compute **where the roster is thin** and turn it into a **need score** per position.

### Inputs per position room
- **Current depth chart** — who's on the roster, ranked 1st/2nd/3rd team.
- **Eligibility remaining** per player (see §6) — a senior with no eligibility ≠ a freshman.
- **Projected departures:**
  - Graduating seniors (no eligibility left).
  - **NFL early entries** (draft-eligible juniors/redshirt sophomores likely to leave).
  - **Outgoing portal** (players who entered/likely to enter the portal).
  - **Attrition** (injury retirements, dismissals, transfers, academic).
- **Incoming** — committed high-school signees + committed transfers at that position.

### Scholarship math
- Historically the **85-scholarship limit** (FBS). The model is evolving toward **roster caps** (a ~105-player roster limit with potential for everyone to be scholarship-eligible). **Model both**: track a `scholarshipCount` and a `rosterCount` against configurable `scholarshipLimit` / `rosterLimit`.
- **Counters:** each scholarship player counts 1.0; track available scholarships = limit − committed − returning.

### Need score (illustrative formula)
```
projectedReturning(pos) = currentRoster(pos) − projectedDepartures(pos) + incomingCommits(pos)
idealDepth(pos)         = scheme-defined target (e.g., QB:3, OL:9–10, WR:6–7)
needScore(pos)          = weight × max(0, idealDepth − projectedReturning)
                          adjusted for quality (starter-caliber gaps weigh more than depth gaps)
```

> Data note: model `RosterSlot` (player at position with `depthRank`, `eligibilityRemaining`, `departureRisk`), `DepthChart` (snapshot by position), and a computed `PositionNeed` (`position`, `needScore`, `idealDepth`, `projectedReturning`, `priority`).

### Roster-construction goals
- **Class balance** — avoid stacking all eligibility at one position in one class (prevents future cliffs).
- **Age/eligibility distribution** — a healthy spread of freshmen → seniors so the team doesn't gut itself in one year.
- **Redshirt strategy** — preserve a year of eligibility for young players (see §6); transfers are often "win-now" and reduce redshirt flexibility.
- **HS vs. portal mix** — portal fills immediate needs (older, proven, less projection); HS recruiting builds the long-term pipeline.

---

## 6. Scholarship & Eligibility Tracking

### The eligibility clock
- A player has **4 seasons of competition** to be used within a **5-year window** ("4 in 5").
- **Redshirt:** A player may play in up to **4 games** in a season and still preserve that year (redshirt). Burning a redshirt = using a season.
- **COVID year legacy:** Athletes on rosters in 2020 received an extra year of eligibility; this is aging out but still affects some "super-senior" transfers. Recent rule changes/litigation (e.g., JUCO-year disputes) continue to expand eligibility cases — model eligibility as **data, not hard-coded rules**.

### Years remaining
```
yearsRemaining = seasonsAllowed − seasonsUsed   (clamped ≥ 0)
                 + grantedExtraYears (COVID/waiver)
```
This is **the** key transfer-value attribute: a transfer with **3 years remaining** is far more valuable (and a bigger roster commitment) than a one-year rental graduate transfer.

> Data note: `Player.eligibility` = { `seasonsUsed`, `seasonsAllowed` (default 4), `redshirtUsed` (bool), `extraYears`, `yearsRemaining` (computed), `clockExpiresSeason` }. Surface `yearsRemaining` prominently on every board entry.

### Scholarship tracking
- `scholarshipStatus`: scholarship | preferred-walk-on | walk-on.
- Team-level `ScholarshipLedger`: limit, committed, returning, available, plus NIL/budget tie-in.

---

## 7. Scheme Fit

"Scheme fit" = does the player's skill set match how *this* staff plays? Concrete, position-specific criteria coaches actually use.

### Offensive schemes
| Scheme | Characteristics | Fit criteria examples |
|---|---|---|
| **Air Raid / Spread** | 4 WR, fast tempo, quick game, RPO | QB: quick release, accuracy, processing. WR: separation, slot quickness. OL: pass-set athleticism over mass. |
| **Pro-style** | Under center, play-action, TE-heavy | QB: arm strength, footwork. TE: in-line blocking. OL: power. |
| **RPO-heavy** | Run-pass options off zone reads | QB: decision-making, run threat. RB: vision in zone. |
| **Zone run scheme** | Outside/inside zone blocking | OL: lateral movement, reach blocks, athleticism. RB: one-cut vision. |
| **Gap/Power run scheme** | Pulling guards, downhill | OL: drive blocking, pulling ability, mass. RB: contact balance, downhill. |

### Defensive schemes
| Scheme | Characteristics | Fit criteria examples |
|---|---|---|
| **4-3** | 4 DL, 3 LB | DE: edge rush + set. DT: gap penetration. LB: range. |
| **3-4** | 3 DL, 4 LB; OLBs rush | NT: two-gap mass. EDGE/OLB: stand-up rush + drop. ILB: physicality. |
| **Multiple** | Shifts between fronts | Versatile, position-flexible bodies. |
| **4-2-5 nickel base** | 4 DL, 2 LB, 5 DB | Nickel: slot coverage + run support. Smaller, faster box. LB: cover ability. |
| **Man coverage** | Press/man corners | CB: hip fluidity, recovery speed, length. |
| **Zone coverage** | Pattern-match, eyes on QB | CB/S: instincts, click-and-close, range. |

> Data note: model `Scheme` (offense/defense, attributes) and per-position **fit profiles** (target measurable ranges + trait weights). A `SchemeFitScore(player, scheme, position)` becomes a sortable evaluation dimension. Make criteria **configurable per program** — Maryland's specific scheme drives the weights.

---

## 8. Contact & Offer Workflow

### Contact rules
- A player **in the portal** may be contacted by any school — no tampering issue.
- **Contact periods** (NCAA recruiting calendar): contact, evaluation, quiet, and dead periods govern *when/how* coaches may interact. **Dead period** = no in-person contact (phone/digital OK). Model a `RecruitingCalendar` of period types by date.

### Visits
| Visit type | Definition |
|---|---|
| **Unofficial** | Prospect pays own way; unlimited |
| **Official** | School-funded (travel, lodging, meals); limited number; the serious step |

Track `Visit` (`player`, `type`, `date`, `status`: scheduled|completed|canceled).

### Offer → commitment → enrollment
1. **Offer extended** — scholarship offer (head coach authority).
2. **Commitment** — verbal, non-binding; player can decommit.
3. **NLI (National Letter of Intent)** — binding signing (for HS; transfers often use a financial aid agreement / different paperwork in portal era).
4. **Enrollment** — player officially on campus & rostered.

### Enrollment timing (critical for portal)
- **Mid-year / January enrollee:** Transfers who enroll in spring semester. They go through **spring practice**, learn the playbook early, and compete for fall starting jobs. Highly valued — model `enrollmentTiming`: midYear vs. summer.
- **Summer enrollee:** Arrives in June/July; less runway before fall camp.

> Data note: `Offer` (`player`, `extendedAt`, `extendedBy`, `status`), `Commitment` (`committedAt`, `firm`/`soft`), `Enrollment` (`timing`, `semester`, `enrolledAt`).

---

## 9. Key Metrics & Data Points (per position)

Coaches blend **production**, **advanced grades**, **measurables**, and **recruiting pedigree**.

### Universal
- **Recruiting rankings:** star rating (2★–5★), composite score/ranking (247/On3-style), original HS ranking.
- **Snap counts** & games played (durability, experience).
- **Measurables:** height, weight, wingspan/arm length, hand size, 40-yard dash, vertical, broad jump, 3-cone, shuttle.
- **Advanced grades:** PFF-style overall + facet grades (e.g., pass-block, run-block, coverage, pass-rush).

### Position-specific production stats
| Position | Key stats |
|---|---|
| QB | Completion %, yards, TD/INT, yards/attempt, QB rating, sack %, PFF passing grade, big-time-throw %, turnover-worthy-play % |
| RB | Rush yards, YPC, yards after contact, missed tackles forced, receiving yards, fumbles |
| WR/TE | Receptions, yards, YPR, TDs, drop rate, contested-catch %, yards after catch, separation |
| OL | Pressures/sacks allowed, pass-block & run-block grade, penalties, snaps |
| DL/EDGE | Sacks, pressures, hurries, QB hits, TFLs, run-stop %, pass-rush win rate |
| LB | Tackles, TFLs, missed-tackle %, coverage grade, run-stop %, blitz production |
| CB/S | Tackles, PBUs, INTs, completion % allowed, yards/coverage-snap, missed-tackle %, passer rating allowed |
| K/P | FG % (by distance band), long, touchback %, net punt avg, punts inside 20, hang time |

> Data note: model a flexible `Stat` / `PlayerSeasonStats` structure keyed by `season`, `position`, with a JSON/EAV bag for position-specific metrics plus first-class columns for the universal ones (snaps, measurables, PFF overall). Source-tag every stat (`source`, `verified`).

---

## Summary of Core Entities (for the data model)

`Player`, `Position`, `Scheme`, `PortalEntry`, `Evaluation`, `Board`, `BoardEntry`, `RosterSlot`, `DepthChart`, `PositionNeed`, `ScholarshipLedger`, `RecruitingCalendar`, `TransferWindow`, `Visit`, `Offer`, `Commitment`, `Enrollment`, `PlayerSeasonStats`, `User`/`StaffRole`.

Key cross-cutting attributes to surface everywhere: **position**, **years of eligibility remaining**, **portal status**, **staff grade/tier**, **scheme-fit score**, **need score** for the player's position, and **enrollment timing**.
