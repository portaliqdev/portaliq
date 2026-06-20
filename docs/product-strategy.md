# Moneyball for Maryland — Product Strategy

**An AI-powered NCAA Division I College Football Transfer Portal intelligence platform.**

*Mental model: Perplexity + Hudl + 247Sports + an AI Recruiting Coordinator — football only.*

---

## 1. Product Vision & Positioning

**Vision.** Moneyball for Maryland gives a college football staff an unfair information advantage in the transfer portal. It turns a chaotic firehose of thousands of entering players into a ranked, scheme-fit, roster-aware recruiting board — so the staff knows exactly whom to call first, why they fit, and what it will take to land them, before competing programs even finish reading the portal feed.

**The Moneyball thesis, applied to the portal.** The original Moneyball insight was that the market mispriced baseball talent because everyone evaluated the same way on the same surface stats. The transfer portal is that same inefficient market, only faster and noisier. Programs over-index on recruiting-service star ratings, prior school brand, and gaudy box-score numbers, while systematically undervaluing players who are an excellent *scheme fit*, who produced efficient snaps behind bad offensive lines, who fit a specific roster gap, or who simply entered late and got overlooked. The edge is not "find the best player" — it is "find the player who is most undervalued *relative to what our system needs and our roster lacks*." A G5 corner with elite man-coverage tape and three years of eligibility can be worth more to a Cover-1 defense than a higher-rated Power 4 zone corner. Our product makes that argument explicitly, with evidence, in seconds.

**Why now.** The portal/NIL era created the conditions. (1) The portal opened in 2018 and now sees 2,500–3,000+ FBS players entering per cycle across two windows. (2) One-time-transfer freedom and the elimination of the sit-out year mean transfers are immediately eligible — every entrant is a plug-and-play roster decision, not a project. (3) NIL turned roster construction into something resembling salary-cap management. (4) The 105-man roster era (replacing the 85-scholarship model) makes deliberate roster construction non-negotiable. Staffs are drowning. The teams that win the portal win on *speed and judgment of information*, and almost none of them have purpose-built tooling — they run on spreadsheets, group texts, and TV-copy film clips. That is the gap.

**Positioning.** We are not a recruiting *database* (247Sports/On3) and not a film *library* (Hudl). We are the *decision layer* that sits on top of both: an AI recruiting coordinator that evaluates, prioritizes, and recommends. Football only. Power 4 and Group of Five FBS transfers.

---

## 2. User Personas

### Director of Player Personnel ("The DPP") — primary power user
- **Goals.** Cover the *entire* portal so nothing is missed; build and maintain the master board; feed the head coach a clean priority list.
- **Daily JTBD.** Triage every new portal entry; tag fit/position/eligibility; assign players to position-coach queues; keep the board ranked; brief the staff in the morning meeting.
- **Pains.** Volume is unmanageable solo; players enter and commit within 48 hours; intel lives in 6 spreadsheets and a group chat; constant fear of "the one we missed."
- **Usage.** Multiple hours daily, all-day during portal windows.
- **Success.** "We evaluated 100% of entrants at our positions of need and never got surprised by a name."

### Recruiting Coordinator — primary
- **Goals.** Convert evaluations into contact and offers; manage relationships and visit logistics; close commitments.
- **Daily JTBD.** Work the board top-down; prioritize today's call list; track contact status, visit scheduling, and offer status; coordinate with position coaches on who's leading each recruitment.
- **Pains.** Knowing *who to contact right now* vs. who can wait; losing players to faster programs; no single source of truth for contact/offer status.
- **Usage.** Daily; intense during contact periods.
- **Success.** "Higher hit rate on offers, fewer dropped recruitments, faster from evaluation to first contact."

### Head Coach — primary, low-frequency / high-stakes
- **Goals.** Win the roster. Approve priorities, allocate NIL/visit resources, make final calls on the few that matter.
- **Daily JTBD.** Review the top of the board; ask sharp questions ("why him over the other guy?"); sign off on offers and official-visit invites.
- **Pains.** Too little time, too much noise; needs the *answer*, not the spreadsheet; wants confidence the staff covered the field.
- **Usage.** A few focused minutes daily; deeper during decision moments.
- **Success.** "I trust the board. The top 5 at each need are right, and I know the why behind each in one glance."

### Position Coach (e.g., DBs, OL, WR) — primary, position-scoped
- **Goals.** Own evaluation and relationships for their room; fill their two-deep; protect against busts in their position group.
- **Daily JTBD.** Watch tape / read scouting reports on their position's entrants; rank their queue; flag must-gets; build relationships with targets.
- **Pains.** Hard to compare players across schools/competition levels; tape takes forever; wants scheme-specific fit, not generic grades.
- **Usage.** Daily during windows, scoped to their position.
- **Success.** "I found a starter who fits exactly what we ask the position to do, and I knew it before anyone else."

### Recruiting Analyst / Graduate Assistant — secondary, high-volume labor
- **Goals.** Do the legwork: build player profiles, log data, draft scouting notes, keep the board current.
- **Daily JTBD.** Enter/verify player data; pull tape; draft AI scouting reports for staff review; maintain board hygiene.
- **Pains.** Manual data entry is endless; inconsistent info across sources; thankless and slow.
- **Usage.** All day during windows.
- **Success.** "I produced 3x the evaluations at the same quality and the staff trusted my reports."

### Football Operations Staff — secondary
- **Goals.** Logistics and compliance — visit scheduling, eligibility/credit verification, offer documentation, NLI tracking.
- **Daily JTBD.** Track official/unofficial visit calendars; verify eligibility/years remaining; manage offer and commitment status.
- **Pains.** Compliance risk; calendar chaos; status falling out of sync with recruiting.
- **Usage.** Daily; surges around visit weekends and signing periods.
- **Success.** "Clean records, no compliance surprises, every visit and offer accounted for."

---

## 3. Core Recruiting Workflows

The product supports the end-to-end portal recruiting funnel, strategically framed as five connected stages:

1. **Portal Monitoring.** Continuously surface new entrants, filtered to the program's positions of need and roster-construction goals. The DPP triages; nothing slips.
2. **Evaluation.** For each relevant entrant, produce a scheme-fit grade, an AI scouting report, eligibility/snap history, and an "undervalued?" signal. Compare like-for-like across competition levels.
3. **Board Management.** Rank players on a kanban recruiting board (e.g., *Identified → Evaluating → Priority Target → Contacted → Visiting → Offered → Committed*). The board is the shared source of truth across the staff.
4. **Contact / Offer.** Prioritize the daily call list; track contact status, relationship owner, and offer status; manage official/unofficial visit pipeline.
5. **Commitment.** Convert offers to commitments; track through NLI and enrollment; update the roster model so the *next* need is already visible.

The connective tissue is the **AI Recruiting Assistant**, which can answer cross-cutting questions at any stage ("Who are the top 3 uncommitted edge rushers with 2+ years left who fit a 3-3-5?") and the **roster-needs engine**, which keeps every stage anchored to actual roster gaps.

---

## 4. The Transfer Recruiting Lifecycle (Strategic Framing)

- **Entry windows.** The portal opens in defined windows (a primary winter window after the regular season and a spring window). Players also enter via the post-spring and coaching-change-triggered openings. The platform's tempo is dictated by these windows — monitoring intensity, board churn, and decision speed all spike.
- **Evaluation period.** From the moment a player enters, the clock starts. Top entrants are evaluated and contacted within hours. Our edge is compressing evaluation from days to minutes without sacrificing rigor.
- **Contact period.** Once eligible to contact, staffs work the board top-down. Relationship ownership, message cadence, and competing-offer awareness matter.
- **Official & unofficial visits.** Officials (program-funded) are scarce, high-leverage, and capped — they go to true priorities. Unofficials are flexible. Visit scheduling is a logistics and prioritization problem the board must reflect.
- **Offers.** An offer is a real resource decision in the NIL/105 era — it carries roster-spot and budget implications. The board tracks who's been offered and the implied roster math.
- **Commitment → NLI → enrollment.** Commitment is a verbal; the National Letter of Intent (or equivalent) formalizes it; enrollment (often mid-year for portal players seeking spring ball) completes it. Eligibility/credit verification gates enrollment. Each commitment updates the roster model and reopens the next need.

Strategically: the lifecycle is a *race against time and competing programs*, run against a *finite roster and budget*. The product wins by maximizing coverage and judgment speed at every gate.

---

## 5. Value Propositions & Differentiation

| Competitor | What they do | Where they fall short | Our edge |
|---|---|---|---|
| **247Sports / On3** | Rankings, portal news, NIL valuations | Built for fans/media; generic star ratings; no *your-scheme* fit; no decision tooling | Scheme-specific fit grades and roster-aware prioritization for *one program's* needs |
| **Hudl** | Film library and tagging | Film without judgment; no portal monitoring, no board, no AI evaluation | We turn film/stats into a ranked recommendation and scouting report |
| **Spreadsheets + group texts** | What most staffs actually use | No coverage guarantee, no AI, no shared truth, slow, error-prone | A single source of truth with AI evaluation and instant prioritization |

**Core value props:**
1. **Total coverage.** Evaluate 100% of relevant entrants — never get surprised by a name.
2. **Scheme fit, not star ratings.** Grades tuned to *this* program's offense/defense, not a generic national ranking.
3. **Roster-aware prioritization.** Every recommendation is anchored to actual two-deep gaps and roster-construction goals.
4. **Speed.** Minutes from entry to evaluated, ranked, and assigned.
5. **An AI recruiting coordinator.** Ask questions in plain English; get sourced, football-literate answers and auto-generated scouting reports.
6. **Undervaluation detection.** Surface overlooked/efficient players the market is mispricing — the Moneyball edge.

---

## 6. MVP Definition

**Goal of v1:** Prove that a staffer can run the full evaluate-and-prioritize loop on a realistic portal (300+ mock players across Big Ten, SEC, ACC, Big 12, and Group of Five) faster and smarter than with spreadsheets. Phase 1 is a **mock-data MVP** (no real auth/backend; see roadmap).

**In scope — mapped to the 8 required capabilities:**
1. **Search the portal** — filter/sort 300+ players by position, eligibility/years left, school, conference, fit, status.
2. **Evaluate players** — per-player profile with scheme-fit grade, snap/production history, eligibility, and an undervaluation signal.
3. **Compare players** — side-by-side comparison at a position (stats, fit, eligibility, board status).
4. **Recruiting boards (kanban)** — drag-and-drop board through the funnel stages; the shared source of truth.
5. **Roster / team-needs analysis** — a needs view that ranks positions by gap and ties recommendations to the two-deep.
6. **AI scouting reports** — generate a written report per player (strengths, fit, projection, risks).
7. **AI recruiting assistant** — natural-language Q&A over the portal and roster ("top uncommitted slot receivers with 2+ years left").
8. **Prioritize recruiting actions** — a ranked daily action list (who to contact/evaluate/visit next).

**Explicitly OUT of v1 (scope cuts):**
- Real film ingestion/video player (use stats + mock tape references only).
- Live, real-time portal data feeds and third-party data integrations.
- Real authentication, multi-tenant security, and role permissions (mocked).
- NIL budgeting/cap-management tooling and dollar-level valuations.
- Predictive commitment-probability modeling.
- Compliance/eligibility automation and NLI document workflows (status fields only, not enforcement).
- Mobile-native apps; messaging/CRM outreach automation.
- Non-football sports and non-FBS levels.

---

## 7. Success Metrics / KPIs

- **Time-to-evaluate.** Median minutes from a player entering the portal to a completed evaluation. Target: minutes, not hours.
- **Portal coverage.** % of relevant entrants (at positions of need) evaluated within 24 hours. Target: ~100%.
- **Board throughput.** Players moved through funnel stages per day/window; time a priority target sits before first contact.
- **Coach adoption.** % of staff using the board as the source of truth daily; head-coach weekly active use.
- **Prioritization accuracy.** % of offered/committed players that originated from the top of the AI-prioritized list (are we recommending the right names?).
- **Undervaluation hit rate.** Commits flagged as "undervalued" who become contributors (snaps/starts) — proves the Moneyball edge.
- **Time-to-first-contact.** Median time from evaluation to first contact for priority targets.
- **AI assistant utility.** Queries per user per session; % of evaluations that used a generated scouting report.

---

## 8. Future Roadmap

**Phase 1 — Mock MVP (current).** Local mock data (300+ players), all 8 capabilities, no backend/auth. Goal: validate the workflow and the "Moneyball" decision value with a coaching staff.

**Phase 2 — Firebase + real data & auth.** Firebase backend (via the existing `src/lib/di.ts` seam), real authentication and staff roles (DPP / coordinator / position coach / head coach / GA), persistent boards, multi-user collaboration, and ingestion of real portal-entry and roster data. Audit trail and shared state.

**Phase 3 — Advanced AI & film.** Film integration (clip references → tagged tendencies), deeper scheme-fit models trained on play-type/alignment data, richer AI scouting from tape, and stronger undervaluation models across competition levels.

**Phase 4 — NIL & valuation.** NIL budget/cap modeling, market-value estimates per player, and ROI-aware roster construction (cost vs. projected snaps/wins).

**Phase 5 — Predictive intelligence.** Commitment-probability modeling (likelihood a target picks us), competing-offer awareness, attrition/portal-entry prediction for our *own* roster, and full-roster optimization against the 105-man and budget constraints.

---

## 9. Key Risks & Assumptions

**Assumptions.**
- Staffs will trust AI-generated grades enough to *act* — provided every recommendation is explainable and sourced.
- Scheme fit can be meaningfully encoded from available stats/tape (validated in Phase 1 with mock data, proven in Phase 3).
- The portal remains the dominant roster-building channel and windows/rules stay broadly stable enough to build around.
- A single shared board can become the staff's source of truth, displacing spreadsheets and group texts.

**Risks.**
- **Data access.** Real-time, accurate portal and roster data is the lifeblood; without reliable feeds (Phase 2+), coverage claims weaken. *Mitigation:* design ingestion-agnostic; prove value on mock data first.
- **Trust / adoption.** Coaches are skeptical of black-box grades. *Mitigation:* every AI output is explainable, sourced, and overridable; the human stays in command.
- **Speed of the market.** Players commit in 48 hours; the tool must be fast enough to matter. *Mitigation:* optimize the evaluate-and-prioritize loop above all else.
- **Regulatory volatility.** Portal windows, NIL rules, roster limits, and eligibility rules are changing fast. *Mitigation:* keep lifecycle logic configurable, not hard-coded.
- **AI accuracy / hallucination.** A confidently wrong scouting report erodes trust instantly. *Mitigation:* ground reports in structured player data; flag uncertainty; require human review for Phase 1.
- **Competitive response.** 247Sports/On3/Hudl could move into the decision layer. *Mitigation:* win on program-specific scheme fit and roster-awareness — the thing generic platforms structurally cannot do.
