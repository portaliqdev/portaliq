# PortalIQ — UI/UX Design System

**Project:** "Moneyball for Maryland" — NCAA D1 (FBS) College Football Transfer Portal Intelligence Platform
**Author:** Agent 6 — UI/UX Architect
**Stack target:** Next.js (App Router) + TypeScript + Tailwind. SVG/Tailwind-first data viz, no heavy chart libraries.
**Status:** Implementation-ready. Engineers should be able to build pixel-confident screens from this document.

> **North star:** This is a *front-office war room*, not a SaaS admin panel. Every screen should feel like an NFL Draft board running in a dark scouting room at 2 a.m. during the portal window — dense, fast, confident, and football-literate. If a screen could be mistaken for a generic CRM, a campus engagement app, or a Stripe-style dashboard, it is wrong.

---

## 1. Design Principles & Visual Language

### The feel: war room / front office

PortalIQ is the decision layer a staff stares at for hours during a 48-hour decision cycle. The aesthetic is **broadcast-grade sports operations software**: dark, high-contrast, data-dense, with a scoreboard/jersey-board confidence. Think the wall of monitors in a draft room — ranked names, position lanes, grades, and a few loud accent colors that carry meaning, never decoration.

**Seven principles**

1. **Density is a feature, not a bug.** Coaches want to see 30 players at a glance, not 6 padded cards. Default to compact rows, tabular data, and tight vertical rhythm. Whitespace is earned, not sprayed.
2. **Dark by default ("the war room").** Near-black surfaces with layered elevation. Light theme exists only as an accessibility/print fallback (§9). Color is reserved to carry signal — status, position group, risk.
3. **Numbers are the hero.** Fit scores, years remaining, grades, need scores. Tabular numerals everywhere stats appear. Numbers align, never jitter.
4. **One glance to the answer.** Every list, card, and board surfaces the five cross-cutting attributes the domain bible demands: **position · years remaining · portal status · staff grade/tier · fit score** (plus need context). The head coach gets the *answer*, then the *why* on drill-in.
5. **Maryland identity as signature, not skin.** Maryland Red and Gold are *accent and action* colors — primary buttons, active nav, fit-score peaks, the flag motif. The canvas stays near-black. Never flood a screen in red.
6. **Speed is the brand.** Optimistic updates, skeletons that match final layout, instant filters. The UI should never feel slower than a spreadsheet — that is the bar the product beats.
7. **Explainable & sourced.** Every AI output, fit score, and need score shows provenance on hover/expand. The human stays in command; nothing is a black box.

### The Maryland flag motif (signature element)

A thin, four-quadrant Maryland-flag accent strip (red/gold/black-white checker + cross-bland) is the product's signature. Use it sparingly and deliberately:
- A 3px vertical flag-rail on the far left of the sidebar.
- A flag-pattern divider under the top bar.
- The app logo lockup.
- Loading skeleton shimmer accent.

Never as a background texture behind data. It frames; it does not fill.

### Anti-patterns to avoid (hard "no" list)

| Anti-pattern | Why it's wrong here |
|---|---|
| Rounded, pastel "friendly SaaS" cards with big drop shadows | Reads as a startup dashboard, not scouting software |
| Generic blue/indigo primary, purple gradients | Not Maryland; not football; looks like every B2B tool |
| Sparse, marketing-style hero spacing inside the app | Wastes the screen; coaches need density |
| Emoji status indicators / cute illustrations | Undercuts the front-office seriousness |
| Light theme as the default | Breaks the war-room feel and night-session ergonomics |
| Avatars-and-activity-feed "social" patterns | This is an ops tool, not a team chat |
| Hamburger menu / hidden nav on desktop | This is a power tool; nav is always visible |
| Decorative use of red/gold across whole panels | Kills the signal value of the accent colors |

---

## 2. Color System

Dark-first. Background tiers stack from near-black canvas up through layered surfaces. Accents (Maryland red/gold) carry action and emphasis. Semantic colors carry recruiting state. Position-group colors are a coding language used across cards, lanes, depth charts, and chips.

### 2.1 Core palette (hex)

**Background & surface tiers (dark)**

| Token | Hex | Use |
|---|---|---|
| `bg-canvas` | `#0B0B0C` | App background (Maryland Black) |
| `bg-base` | `#101114` | Page background panels |
| `surface-1` | `#16181D` | Cards, rows, sidebars |
| `surface-2` | `#1E2127` | Raised surfaces, hover rows, popovers |
| `surface-3` | `#262A32` | Active/selected surfaces, kanban cards |
| `overlay` | `#0B0B0Ccc` | Modal scrim (80% black) |

**Borders & dividers**

| Token | Hex | Use |
|---|---|---|
| `border-subtle` | `#23262D` | Hairline dividers, table rules |
| `border-default` | `#2E333C` | Card/input borders |
| `border-strong` | `#3C424D` | Focused/hovered borders |
| `border-accent` | `#E21833` | Active selection edge (Maryland Red) |

**Text**

| Token | Hex | Use |
|---|---|---|
| `text-primary` | `#F4F5F7` | Names, headings, key numbers |
| `text-secondary` | `#B6BAC2` | Labels, secondary stats |
| `text-muted` | `#7C828C` | Metadata, captions, placeholders |
| `text-inverse` | `#0B0B0C` | Text on gold/light fills |
| `text-disabled` | `#565B64` | Disabled |

**Maryland accents (brand)**

| Token | Hex | Use |
|---|---|---|
| `md-red` | `#E21833` | Primary action, active nav, alerts, flag |
| `md-red-hover` | `#C3142B` | Hover state for red |
| `md-red-dim` | `#7A1020` | Red surfaces at low emphasis |
| `md-gold` | `#FFD520` | Highlights, fit-score peaks, stars, flag |
| `md-gold-hover` | `#E6BE12` | Hover for gold |
| `md-gold-dim` | `#8A7410` | Gold at low emphasis |

### 2.2 Semantic colors (recruiting state)

These map directly to the domain enums (`RecruitingStatus`, `BoardStage`, `departureRisk`) and must be used consistently across board, cards, and alerts.

| Token | Hex | Meaning |
|---|---|---|
| `sem-success` | `#22C55E` | Generic positive / verified |
| `sem-commit` | `#16A34A` | Committed to us (locked) |
| `sem-target` | `#FFD520` | Priority target / HOT (gold) |
| `sem-contacted` | `#38BDF8` | Contacted / in-progress (cyan) |
| `sem-evaluating` | `#A78BFA` | Under evaluation (violet) |
| `sem-watching` | `#7C828C` | Watching / unevaluated (muted) |
| `sem-offer` | `#E21833` | Offer extended (Maryland red) |
| `sem-risk` | `#F59E0B` | Caution / medical / departure risk MED |
| `sem-danger` | `#EF4444` | High risk / lost / departure risk HIGH |
| `sem-lost` | `#6B7280` | Lost to another program (greyed) |
| `sem-info` | `#60A5FA` | Neutral info |

### 2.3 Position-group color coding

A consistent language so a coach reads position by color across every surface. Each group has a primary (chip/pill fill text) and a 12–16% alpha tint for lane/row backgrounds.

| Group | Token | Hex | Tint bg (lane) |
|---|---|---|---|
| QB | `pos-qb` | `#F97316` (orange) | `#F9731622` |
| RB | `pos-rb` | `#FB7185` (rose) | `#FB718522` |
| WR | `pos-wr` | `#38BDF8` (sky) | `#38BDF822` |
| TE | `pos-te` | `#2DD4BF` (teal) | `#2DD4BF22` |
| OL | `pos-ol` | `#A78BFA` (violet) | `#A78BFA22` |
| DL | `pos-dl` | `#FACC15` (amber) | `#FACC1522` |
| LB | `pos-lb` | `#34D399` (emerald) | `#34D39922` |
| DB | `pos-db` | `#818CF8` (indigo) | `#818CF822` |
| ST | `pos-st` | `#94A3B8` (slate) | `#94A3B822` |

> These nine groups map 1:1 to `PositionGroup` (QB/RB/WR/TE/OL/DL/LB/DB/ST). They are intentionally distinct from the Maryland brand reds/golds and from semantic colors so position never collides with status.

### 2.4 Fit-score / grade ramp

A 5-stop gradient for fit scores and grades (0–100), used by the FitScoreBadge, percentile bars, and need heatmap.

| Band | Range | Hex | Label |
|---|---|---|---|
| Elite | 90–100 | `#FFD520` (gold) | Champion |
| Strong | 75–89 | `#22C55E` | Starter |
| Solid | 60–74 | `#38BDF8` | Contributor |
| Marginal | 45–59 | `#F59E0B` | Developmental |
| Poor | 0–44 | `#EF4444` | Do Not Recruit |

### 2.5 Tailwind config (`theme.extend.colors`)

```js
// tailwind.config.ts → theme.extend
colors: {
  canvas:   '#0B0B0C',
  base:     '#101114',
  surface:  { 1: '#16181D', 2: '#1E2127', 3: '#262A32' },
  hairline: { DEFAULT: '#23262D', strong: '#2E333C', heavy: '#3C424D' },
  ink:      { DEFAULT: '#F4F5F7', sub: '#B6BAC2', muted: '#7C828C',
              inverse: '#0B0B0C', disabled: '#565B64' },
  md: {
    red:  { DEFAULT: '#E21833', hover: '#C3142B', dim: '#7A1020' },
    gold: { DEFAULT: '#FFD520', hover: '#E6BE12', dim: '#8A7410' },
  },
  sem: {
    success: '#22C55E', commit: '#16A34A', target: '#FFD520',
    contacted: '#38BDF8', evaluating: '#A78BFA', watching: '#7C828C',
    offer: '#E21833', risk: '#F59E0B', danger: '#EF4444',
    lost: '#6B7280', info: '#60A5FA',
  },
  pos: {
    qb: '#F97316', rb: '#FB7185', wr: '#38BDF8', te: '#2DD4BF',
    ol: '#A78BFA', dl: '#FACC15', lb: '#34D399', db: '#818CF8', st: '#94A3B8',
  },
}
```

### 2.6 CSS variables (light/dark)

Drive Tailwind from CSS variables so a light/print fallback can flip one block. Reference via `bg-[var(--surface-1)]` or a `@theme` mapping.

```css
:root, [data-theme="dark"] {
  --canvas: #0B0B0C; --base: #101114;
  --surface-1: #16181D; --surface-2: #1E2127; --surface-3: #262A32;
  --hairline: #23262D; --hairline-strong: #2E333C;
  --ink: #F4F5F7; --ink-sub: #B6BAC2; --ink-muted: #7C828C;
  --md-red: #E21833; --md-gold: #FFD520;
}
[data-theme="light"] { /* accessibility / print fallback only */
  --canvas: #FFFFFF; --base: #F4F5F7;
  --surface-1: #FFFFFF; --surface-2: #F1F2F4; --surface-3: #E7E9ED;
  --hairline: #DDE0E5; --hairline-strong: #C7CCD3;
  --ink: #0B0B0C; --ink-sub: #3C424D; --ink-muted: #6B7280;
  --md-red: #C3142B; --md-gold: #8A7410; /* darkened for AA on white */
}
```

---

## 3. Typography

Two-typeface system: a **condensed sport display face** (scoreboard/jersey energy) for headings, player names, and big numbers; a clean, neutral sans for data and body. All faces self-hosted via `next/font` for performance and offline dev (no system Node fetches at runtime).

### 3.1 Font choices

| Role | Primary | Fallback stack | Notes |
|---|---|---|---|
| Display / headings / names | **Saira Condensed** (or Oswald) | `'Saira Condensed', 'Oswald', 'Arial Narrow', system-ui, sans-serif` | Condensed, uppercase-friendly, scoreboard feel |
| Body / data / UI | **Inter** | `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif` | High legibility at small sizes |
| Numeric / stats | **Inter** with `font-feature-settings: "tnum" 1` | same | Tabular numerals so columns align |
| Mono (IDs, provenance, code) | **JetBrains Mono** | `'JetBrains Mono', ui-monospace, monospace` | AI tool-call payloads, raw refs |

> Display face is used **UPPERCASE with letter-spacing** for section labels, nav, and table headers (the "jersey/scoreboard" tell). Player names use display face in mixed case for readability at size.

### 3.2 Type scale

| Token | Size / line | Weight | Face | Use |
|---|---|---|---|---|
| `display-xl` | 40 / 44 | 700 | Display | Page hero number (rare — fit score on profile) |
| `display-lg` | 30 / 34 | 700 | Display | Player name on profile |
| `h1` | 24 / 30 | 700 | Display | Page titles |
| `h2` | 19 / 26 | 600 | Display | Section headers |
| `h3` | 16 / 22 | 600 | Sans | Card titles |
| `label` | 11 / 14 | 600 | Display, UPPER, +0.08em | Table headers, nav, eyebrow labels |
| `body` | 14 / 20 | 400 | Sans | Default text |
| `body-sm` | 13 / 18 | 400 | Sans | Dense rows, secondary |
| `caption` | 11 / 14 | 500 | Sans | Metadata, captions |
| `stat-xl` | 28 / 30 | 700 | Sans tnum | Big stat callouts |
| `stat` | 15 / 18 | 600 | Sans tnum | Inline stats |
| `mono-sm` | 12 / 16 | 400 | Mono | IDs, provenance |

**Density rule:** in tables and board cards default to `body-sm` (13px) with tight 18px line height. Reserve 14px+ for prose (AI reports, notes).

---

## 4. Information Architecture & Navigation

### 4.1 Global shell

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR  (h-56px, sticky, surface-1, flag-pattern hairline underline)          │
│ [▮flag][PortalIQ]  ⌘K Search portal, players, board…   [Org:Maryland▾][2026▾]  │
│                                                          [Winter Window ◷4d][◔][@]│
├───────────┬────────────────────────────────────────────────────────────────────┤
│ SIDEBAR   │                                                                    │
│ w-228px   │   MAIN CONTENT (max-w fluid, page-specific)                        │
│ surface-1 │                                                                    │
│ flag-rail │                                                                    │
│           │                                                                    │
│ ◉ Dashboard                                                                    │
│ ◉ Transfer Portal                                                              │
│ ◉ Recruiting Board                                                             │
│ ◉ Team Needs                                                                   │
│ ◉ Reports                                                                      │
│ ◉ AI Assistant                                                                 │
│ ─────────                                                                      │
│ ◉ Settings                                                                     │
│           │                                                                    │
│ [window   │                                                                    │
│  status   │                                                                    │
│  widget]  │                                                                    │
└───────────┴────────────────────────────────────────────────────────────────────┘
```

**Left sidebar (persistent, always visible on desktop, `w-228px`).**
- 3px Maryland flag-rail on the far-left edge (signature motif).
- Nav items: **Dashboard, Transfer Portal, Recruiting Board, Team Needs, Reports, AI Assistant** — then a divider — **Settings**.
- Each item: icon + display-face label + optional count badge (e.g. Transfer Portal shows new-entrants count; AI Assistant shows unread insight count).
- Collapsible to a 56px icon-rail (`⌘\`) for laptop screens, but never fully hidden.
- Bottom-pinned **window-status widget**: window type, days left, entrants today.

**Top bar (sticky, `h-56px`).**
- Logo lockup (flag chip + "PortalIQ" in display face).
- **Global search** (`⌘K`) — center, prominent, placeholder "Search portal, players, board…".
- **Org/team switcher** — `Maryland ▾` (Phase 2 multi-tenant; Phase 1 shows Maryland fixed).
- **Season selector** — `2026 ▾` (recruiting cycle year).
- **Window status pill** — `Winter Window ◷ 4d` colored by urgency (gold ≤7d, red ≤2d).
- **Notifications bell** with unread dot; **user avatar/menu**.

### 4.2 Nav states

| State | Treatment |
|---|---|
| Default | `text-secondary`, icon muted |
| Hover | `surface-2` bg, `text-primary`, 120ms |
| Active (current route) | `surface-3` bg, `md-red` 3px left indicator, `text-primary`, icon in `md-red` |
| With count | trailing pill: `surface-2` bg, `text-secondary`; if "new/urgent", `md-red` bg |
| Collapsed rail | icon-only, tooltip on hover showing label + count |

### 4.3 Command palette / global search (`⌘K`)

A single fast palette is the power-user spine. Opens centered, `surface-2`, max-w-640px, with the flag hairline at top.

```
┌─────────────────────────────────────────────────────────┐
│ ⌘K  > top edge CBs 2+ yrs man coverage_                  │
├─────────────────────────────────────────────────────────┤
│ PLAYERS                                                   │
│  [DB] Jordan Pace · CB · Cincinnati · 2yr · Fit 91 ▸    │
│  [DB] Marcus Hill · CB · Toledo · 3yr · Fit 88 ▸        │
│ NAVIGATE                                                  │
│  → Transfer Portal (filtered: CB, 2+ yrs)               │
│  → Recruiting Board                                      │
│ ACTIONS                                                   │
│  ⚡ Ask AI: "top edge CBs, 2+ yrs, man coverage"  ↵     │
│  ＋ Add filter preset…                                   │
└─────────────────────────────────────────────────────────┘
```

- **Mixed results:** players (with inline position/school/years/fit), navigation targets, and **actions** (the top action is always "Ask AI: <your query>", routing natural-language queries straight into the assistant).
- Keyboard: `↑/↓` to move, `↵` to select, `⌘↵` to open in new context, `Esc` to close.
- Recent searches + saved filter presets shown on empty state.

---

## 5. Page-by-Page Layouts

### 5.1 Dashboard — "what to focus on today"

Mission control. Answers "where do I spend the next hour?" the instant it loads. Built for the DPP's morning triage and the head coach's daily glance.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ DASHBOARD                       Winter Window · Day 12 · 4 days left         │
│ ─────────────────────────────────────────────────────────────────────────── │
│ ┌── KPI STRIP (4 cards) ──────────────────────────────────────────────────┐ │
│ │ NEW IN PORTAL │ EVALUATED   │ PRIORITY      │ COVERAGE              │     │
│ │   23 today    │  18 / 23    │ TARGETS 14    │  92% of need positions│     │
│ │   ▲ +9 vs avg │  78% done   │  3 uncontacted│  ████████░ (sparkbar) │     │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌── PRIORITY ACTIONS (ranked) ────────────┐ ┌── POSITION NEEDS ──────────┐ │
│ │ "Who to contact / evaluate next"         │ │ Heatmap by group           │ │
│ │ 1 [DB] J. Pace  CB  Fit91  ◉Uncontacted │ │  QB ▓ RB ░ WR ▓▓ TE ░     │ │
│ │   → 3yr left · need CRITICAL · CALL ↗    │ │  OL ▓▓▓ DL ▓ LB ░ DB ▓▓▓  │ │
│ │ 2 [WR] T. Vance WR Fit88  ◉Evaluate      │ │  (CRITICAL=red, deep=gold) │ │
│ │ 3 [OL] R. Diaz  OT Fit85  ◉Film due      │ │  ▸ View Team Needs         │ │
│ │ … (top 8, "Show all")                    │ └────────────────────────────┘ │
│ └──────────────────────────────────────────┘ ┌── AI RECOMMENDATIONS ──────┐ │
│ ┌── NEW PORTAL ENTRANTS (today) ──────────┐ │ ⚡ "Undervalued at WR:      │ │
│ │ [WR] K. Boyd  South FL  4yr  Fit 84  +  │ │   3 efficient slots behind │ │
│ │ [DL] M. Otoo  Pitt     2yr  Fit 79  +   │ │   bad OL the market missed"│ │
│ │ [CB] D. Reyes Akron    3yr  Fit 91  +   │ │   ▸ Review 3 players        │ │
│ │ … (scroll, quick-add to board)          │ │ ⚡ "OL depth cliff in 2027"│ │
│ └──────────────────────────────────────────┘ └────────────────────────────┘ │
│ ┌── ALERTS / WHAT CHANGED ─────────────────────────────────────────────────┐ │
│ │ ⚠ Target [WR] T. Vance committed to Oregon — LOST                        │ │
│ │ ◷ [CB] J. Pace visiting this weekend · ◉ 2 new evaluations by Coach Hill │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

**Components:** KPI cards w/ sparkline, `PriorityActionList` (ranked, with one-click stage actions), `NeedHeatmap`, AI recommendation cards (undervaluation + roster-cliff insights), `NewEntrantsList` (quick-add to board), `AlertFeed`.
**Data:** counts from portal + board, `PositionNeed[]`, top-N `AIInsight` of kind `SUMMARY`/`FIT_ANALYSIS`, recent `TransferEntry` (new today), board stage-change events, lost-target alerts.

### 5.2 Transfer Portal — the firehose triage

The core search/filter view over 300+ entrants. Filter rail left, results center, sticky filter summary + sort + list/grid toggle on top.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ TRANSFER PORTAL          312 entrants · 41 match filters   [▤ List][▦ Grid]  │
│ ────────────────────────────────────────────────────────────────────────────│
│ ┌─ FILTER RAIL ─┐ ┌─ RESULTS ──────────────────────────────────────────────┐│
│ │ w-260px       │ │ Sort: [Fit ▾] [Need][Years][Composite][Newest]         ││
│ │               │ │ ─────────────────────────────────────────────────────  ││
│ │ POSITION      │ │ ┌ PlayerCard (list row) ───────────────────────────┐  ││
│ │ ☑ DB ☑ WR ▢QB │ │ │[DB] Jordan Pace  CB  6'1"/195  Cincinnati(AAC)   │  ││
│ │ ▢ OL ▢ DL …   │ │ │ ★★★★ · 3yr · IN_PORTAL · ◉TARGET                 │  ││
│ │               │ │ │ Fit ◉91  Need CRIT  PFF 84   [+ Board][Compare ▢]│  ││
│ │ YEARS LEFT    │ │ └──────────────────────────────────────────────────┘  ││
│ │ ◉ 2+  ○ 3+ ○4 │ │ ┌──────────────────────────────────────────────────┐  ││
│ │               │ │ │[WR] Tyrek Vance  WR 6'2"/205  South FL(AAC)      │  ││
│ │ CONFERENCE    │ │ │ ★★★ · 4yr · IN_PORTAL · ◉EVALUATING  Fit ◉88     │  ││
│ │ ☑ Big Ten ☑SEC│ │ └──────────────────────────────────────────────────┘  ││
│ │ ▢ ACC ☑ AAC … │ │ … virtualized list, 41 rows                            ││
│ │               │ │                                                        ││
│ │ HEIGHT  72–80 │ │ COMPARE TRAY (sticky bottom when ≥2 picked):           ││
│ │ ▭▬▭ slider    │ │ [Pace][Vance][Diaz] → [Compare 3 ▸]   [Clear]         ││
│ │ WEIGHT 180–340│ └────────────────────────────────────────────────────────┘│
│ │ RATING ★3+    │                                                            │
│ │ FIT  ▭▬▭ 80+  │                                                            │
│ │ STATUS        │                                                            │
│ │ ☑ IN_PORTAL   │                                                            │
│ │ ▢ COMMITTED   │                                                            │
│ │ ELIGIBILITY   │                                                            │
│ │ ☑ JR ☑ GR …   │                                                            │
│ │ ───────────   │                                                            │
│ │ [Clear all]   │                                                            │
│ │ [Save preset] │                                                            │
│ └───────────────┘                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Filter rail dimensions** (maps to `PlayerFilters` + extensions): position (multi-select position pills), years remaining (radio 2+/3+/4), conference (multi), school (typeahead), height/weight (dual-range sliders, inches/lbs), production stats (position-aware quick filters), rating (star min), fit score (range), eligibility class (multi), portal status (multi).
**Behaviors:** filters update query live (debounced 250ms); result count in header updates instantly; each filter group shows active-count badge; "Clear all" + "Save preset". List/grid toggle persists per-user.
**PlayerCard (list row):** position pill (group-colored), name (display face), measurables, school+conference chip, stars, years-remaining badge, portal status, **FitScoreBadge**, need badge, PFF, quick actions (+ to board, compare checkbox). Grid mode = denser tile, 3–4 across.
**Data:** `usePortalSearch(filters)` → `Player[]` already carrying `fitScore`, `needScore`, `recruitingStatus`, `consensusTier`, eligibility, school stamp.

### 5.3 Player Profile — the most important page

The full evaluation surface. Everything a coach needs to make the call, in scannable sections. Two-column: sticky identity/decision rail left, scrollable evidence right. This page must feel like the back of a draft card crossed with a scouting dossier.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ‹ Portal     Jordan Pace                       [+ Board ▾][⚡AI Report][⇄Compare]│
│ ────────────────────────────────────────────────────────────────────────────│
│ ┌─ IDENTITY / DECISION RAIL (sticky, w-320px) ─┐ ┌─ EVIDENCE (scroll) ──────┐│
│ │ [DB]  JORDAN PACE        #7                   │ │ ┌ AI SCOUTING REPORT ──┐ ││
│ │ CB · Cincinnati (AAC)                         │ │ │ ⚡ Opus 4.8 · HIGH    │ ││
│ │ 6'1" / 195 · R · Miami, FL                    │ │ │ "Elite man-cover CB  │ ││
│ │ ───────────────────────                       │ │ │ behind a bad front;  │ ││
│ │   FIT SCORE                                   │ │ │ market is mispricing │ ││
│ │      ◉ 91   ┌── radar ──┐                     │ │ │ his recovery speed." │ ││
│ │  ELITE      │   ▲▲▲     │  (attribute dial    │ │ │ + Strengths  − Concerns│ ││
│ │             └───────────┘   + spider)         │ │ │ Comp: "plays like X" │ ││
│ │ ───────────────────────                       │ │ │ ▸ provenance (3 src) │ ││
│ │ YEARS LEFT      3  (RS-SO)                     │ │ └──────────────────────┘ ││
│ │ PORTAL          IN_PORTAL · Winter            │ │ ┌ MEASURABLES ─────────┐ ││
│ │ NEED (CB)       CRITICAL                       │ │ │ 40: 4.42  Vert: 38"  │ ││
│ │ STAFF GRADE     STARTER (consensus)           │ │ │ Arm: 31" Shuttle 4.1 │ ││
│ │ ELIGIBILITY     RS-SO · 4 in 5                │ │ │ percentile bars/pos  │ ││
│ │ SCHOLARSHIP     SCHOLARSHIP                    │ │ └──────────────────────┘ ││
│ │ ───────────────────────                       │ │ ┌ PRODUCTION (by season)│ ││
│ │ RISK  ▮ MED — injury ACL '24, 1 yr ago        │ │ │ 2025: 14 PBU, 3 INT,  │ ││
│ │ ───────────────────────                       │ │ │ 58% comp allowed,     │ ││
│ │ [+ Add to Board ▾]   [Assign ▾]               │ │ │ 71.2 rating allowed   │ ││
│ │ [⚡ Generate AI Report]                        │ │ │ sparkline trend ▁▂▅▇  │ ││
│ └───────────────────────────────────────────────┘ │ └──────────────────────┘ ││
│                                                    │ ┌ TRANSFER HISTORY ────┐ ││
│  TABS: Overview · Film · Eval Notes · Compare      │ │ Cincinnati → portal  │ ││
│                                                    │ │ (Winter '26) timeline│ ││
│                                                    │ └──────────────────────┘ ││
│                                                    │ ┌ FILM ────────────────┐ ││
│                                                    │ │ ▶ vs Memphis '25 CUT │ ││
│                                                    │ │ ▶ All-22 vs UCF       │ ││
│                                                    │ └──────────────────────┘ ││
│                                                    │ ┌ SIMILAR PLAYERS ─────┐ ││
│                                                    │ │ [DB]M.Hill Fit88 ⇄   │ ││
│                                                    │ │ [DB]D.Reyes Fit87 ⇄  │ ││
│                                                    │ └──────────────────────┘ ││
│                                                    │ ┌ RECRUITING TIMELINE ─┐ ││
│                                                    │ │ ●Identified ●Eval     │ ││
│                                                    │ │ ●Contacted ○Visit ○Offer│││
│                                                    │ └──────────────────────┘ ││
│                                                    │ ┌ NOTES / EVALUATIONS ─┐ ││
│                                                    │ │ Coach Hill (FILM): … │ ││
│                                                    │ │ [+ Add note/eval]    │ ││
│                                                    │ └──────────────────────┘ ││
└────────────────────────────────────────────────────────────────────────────┘
```

**Full section list (the spec):**
1. **Identity header** — position pill, name (display-lg), jersey, school+conference, measurables string, handedness, hometown.
2. **Fit Score + attribute radar** — big FitScoreBadge dial (0–100, gold-ramped) and the RadarChart of position attributes.
3. **Decision facts** — years remaining, portal status+window, position need, consensus staff grade/tier, eligibility block, scholarship status. (The five cross-cutting attributes, front and center.)
4. **Risk assessment** — injury flags, character flags (permissioned), departure/medical risk pill with reason.
5. **AI Scouting Report** — model tag, confidence, headline, strengths/concerns, comparable player, **provenance refs** (which stats/film drove it). Regenerate button.
6. **Measurables** — full combine block with per-position **percentile bars**.
7. **Production** — `PlayerStats` by season, position-shaped metrics table + **trend sparklines**.
8. **Transfer history** — timeline of `TransferEntry` (from school → portal → committed/enrolled).
9. **Film** — `FilmLink` list (cut-up/All-22/highlight) with type badges (Phase 1 = mock references, no player).
10. **Similar players** — comp cards (link + add-to-compare).
11. **Recruiting timeline** — funnel-stage progress (Identified→Eval→Contacted→Visit→Offer→Commit).
12. **Notes / Evaluations** — threaded `Evaluation` + `ScoutingReport` entries, role-attributed, with add form.

**Data:** `usePlayer(id)`, `usePlayerStats`, `useMeasurements`, `useFilmLinks`, `useEvaluations`, `useScoutingReports`, latest `AIInsight`, computed `fitScore`/`needScore`, similar-players query.

### 5.4 Recruiting Board — the kanban source of truth

Horizontal kanban across canonical stages. Columns scroll horizontally; cards are draggable; position filter scopes the whole board; per-column counts and optional WIP limits.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ RECRUITING BOARD  2026 Winter   Filter: [All Pos ▾][Mine][Flags ▾]  [+Player]│
│ ────────────────────────────────────────────────────────────────────────────│
│ WATCHING   EVALUATING   CONTACTED   PRIORITY    OFFER EXT.   COMMITTED  LOST  │
│   (42)        (18)         (11)        (14)        (5)          (3)     (6)   │
│ ┌────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐┌──────┐│
│ │[WR]Boyd│ │[CB]Pace │ │[OL]Diaz │ │[DB]Reyes│ │[WR]Vance│ │[DL]Otoo││[WR]..││
│ │4yr Fit84│ │3yr Fit91│ │2yr Fit85│ │3yr Fit91│ │4yr Fit88│ │2yr Fit79││ LOST ││
│ │★★★★ ◷  │ │◉ @Hill  │ │⚑visit   │ │◉ @Hill  │ │red●OFFER│ │✓COMMIT ││greyed││
│ ├────────┤ ├─────────┤ ├─────────┤ ├─────────┤ └─────────┘ └────────┘└──────┘│
│ │[DL]King│ │[S] Webb │ │[QB]Lane │ │[LB]Cruz │  WIP 5/6                       │
│ │…       │ │…        │ │…        │ │…        │                               │
│ │(scroll)│ │(scroll) │ │(scroll) │ │(scroll) │                               │
│ └────────┘ └─────────┘ └─────────┘ └─────────┘                               │
│  position-tinted left border on each card · drag to move · ⌘drag = copy      │
└────────────────────────────────────────────────────────────────────────────┘
```

**Columns** map to `BoardStage`: Watching, Evaluating, Contacted, Priority, Offer Extended, Committed, Lost. Each column header shows label + count + optional WIP limit; Committed/Lost columns are visually terminal (Committed = green tint, Lost = greyed/desaturated).
**KanbanCard:** position-tinted left border, position pill, name, years badge, FitScoreBadge, assignee avatar, flags (visit/medical/in-window), tier dot. Compact by default; hover reveals quick actions.
**Drag-drop:** smooth lift, column highlight on hover-target, optimistic move (React Query optimistic update per §10), snap-back on error. **Role-gated:** only HEAD_COACH can drop into Offer Extended (enforced in `BoardService`; UI disables the drop with a tooltip for other roles).
**Filters:** position group (scopes all columns), "Mine" (assigned to me), flags. Within a column, cards group by position lane and sort by rank/fit.
**Data:** `useBoardEntries(boardId)` → `BoardEntry[]` with denormalized `playerStamp`; mutations `moveEntryStage`, `updateEntry`.

### 5.5 Team Needs — roster construction analysis

The analytical core surfaced visually. Depth chart per position, departure risk, need heatmap, AI roster recommendations.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ TEAM NEEDS  2026  ·  Scheme: SPREAD / NICKEL_425  ·  Roster 98/105  Schol 82/85│
│ ────────────────────────────────────────────────────────────────────────────│
│ ┌─ NEED HEATMAP (by position) ──────────────────────────────────────────────┐│
│ │  QB ▓▓   RB ░    WR ▓▓▓   TE ░    OL ▓▓▓▓  DL ▓▓   LB ░   DB ▓▓▓   ST ░   ││
│ │  HIGH    LOW     CRIT     LOW     CRIT     HIGH    LOW    CRIT     NONE     ││
│ │  (cell color = priority; size/number = needScore; click → drill)          ││
│ └────────────────────────────────────────────────────────────────────────────┘│
│ ┌─ POSITION DETAIL: CB (selected) ────────────────────┐ ┌ AI RECOMMENDATIONS ┐│
│ │ DEPTH CHART          ELIG   YRS   RISK              │ │ ⚡ "CRITICAL at CB: │ │
│ │ 1 ◉ Marcus Webb      SR     1   ▮▮▮ HIGH (grad)     │ │ 2 starters out, only│ │
│ │ 2 ◉ T. Booker        RS-JR  2   ▮ LOW               │ │ 1 returning w/ 2+yr │ │
│ │ 3 ◉ J. Ali           SO     3   ▮▮ MED (portal?)    │ │ ▸ See 6 portal CBs  │ │
│ │ 4 ░ (open)                                          │ │   2+ yrs, Fit 85+   │ │
│ │ ────────────────────────────────                    │ │ ⚡ "OL 2027 cliff:  │ │
│ │ idealDepth 5 · returning 2 · departures 2           │ │  4 of 5 starters    │ │
│ │ incoming 1 · NEED SCORE 88 · CRITICAL               │ │  expire same year"  │ │
│ │ availableSchol 3                                     │ │ ▸ Plan class balance│ │
│ │ ▸ Browse portal CBs that fit                        │ └─────────────────────┘│
│ └─────────────────────────────────────────────────────┘                       │
│ ┌─ DEPARTURE RISK OVERVIEW ──────────────────────────────────────────────────┐│
│ │ Graduating: 14 · NFL early (proj): 3 · Outgoing portal: 5 · Attrition: 2   ││
│ │ Eligibility distribution bar by class (FR…GR) — spot cliffs                ││
│ └────────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────┘
```

**Components:** `NeedHeatmap` (clickable grid of positions, priority-colored), `DepthChart` (ranked roster slots with eligibility + departure-risk pills), need-math summary (`idealDepth`, `projectedReturning`, `needScore`, `availableScholarships`), AI roster recommendations (undervaluation + class-cliff insights), departure-risk overview with eligibility distribution bar.
**Data:** `useTeamNeeds(orgId)` → `PositionNeed[]`, latest `RosterSnapshot` with `RosterSlot[]`, AI insights of kind `FIT_ANALYSIS`/`SUMMARY`.

### 5.6 Reports

Generated and saved reports: per-position reports, recruiting summaries, portal rankings, weekly updates. Left list of report types, right rendered report with export.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ REPORTS                                              [⚡Generate ▾][⤓ Export] │
│ ───────────────┬────────────────────────────────────────────────────────────│
│ REPORT TYPES   │  POSITION REPORT — Cornerback (2026 Winter)                │
│ ─────────────  │  ───────────────────────────────────────────              │
│ ◉ Position     │  Top 10 portal CBs ranked by program fit                  │
│   - CB  ◉      │  ┌ rank · player · school · yrs · fit · grade · status ┐  │
│   - WR         │  │ 1 J.Pace  Cincinnati 3yr 91 STARTER  TARGET         │  │
│   - OL         │  │ 2 D.Reyes Akron      3yr 91 STARTER  PRIORITY       │  │
│ ◉ Recruiting   │  │ 3 M.Hill  Toledo     2yr 88 STARTER  CONTACTED      │  │
│   Summary      │  └─────────────────────────────────────────────────────┘  │
│ ◉ Portal       │  Narrative: AI rollup of the room's needs + best fits     │
│   Rankings     │  Charts: fit distribution · need vs supply                │
│ ◉ Weekly       │                                                            │
│   Update       │  [⤓ PDF] [⤓ CSV] [Share link]                            │
│ ─────────────  │                                                            │
│ SAVED (12)     │                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Report types:** Position Report (ranked portal players + AI narrative + charts), Recruiting Summary (board state, throughput, what changed), Portal Rankings (top entrants by fit across positions), Weekly Update (digest of new entrants, moves, losses). Export to PDF/CSV; "Share link" (Phase 2).
**Data:** composed from players, board, needs, and `AIInsight`/`ScoutingReport`.

### 5.7 AI Assistant — full chat experience

Conversational front-office analyst. Prompt chips, streamed answers, inline result cards (real player cards, not just text), and **tool-call transparency** (shows which data the AI queried) to honor the explainability requirement.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ AI ASSISTANT                                              [New chat][History]│
│ ────────────────────────────────────────────────────────────────────────────│
│  ┌ PROMPT CHIPS (empty state) ───────────────────────────────────────────┐  │
│  │ ⚡Top uncommitted edge rushers 2+ yrs for a 3-4                        │  │
│  │ ⚡Undervalued slot WRs behind bad OL    ⚡Who fills our CB need?       │  │
│  │ ⚡Compare Pace vs Reyes vs Hill          ⚡Biggest roster cliff 2027   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ▸ You: top uncommitted CBs, 2+ yrs, fit 85+ for our man scheme              │
│                                                                              │
│  ▾ Assistant                                                                 │
│    ┌ TOOL CALL ─ queryPlayers ───────────────────────────┐ (collapsible)    │
│    │ {position:"CB", minYears:2, minFit:85,               │                  │
│    │  status:"IN_PORTAL", scheme:"MAN_COVERAGE"} → 6 hits │                  │
│    └──────────────────────────────────────────────────────┘                 │
│    "Six fit your man-coverage CB need with 2+ years. Top 3:"                 │
│    ┌ INLINE RESULT CARDS ───────────────────────────────┐                   │
│    │ [DB]Pace 91 · [DB]Reyes 91 · [DB]Hill 88   [+Board] │                   │
│    └─────────────────────────────────────────────────────┘                  │
│    "Pace grades highest on recovery speed (4.42, 38" vert);                  │
│     market underrates him — bad front inflated his targets."                 │
│    [Add all to board] [Compare these] [Generate reports]                     │
│                                                                              │
│ ────────────────────────────────────────────────────────────────────────────│
│ [ Ask about the portal, your roster, or any player…              ⚡ Send ]  │
└────────────────────────────────────────────────────────────────────────────┘
```

**Components:** `PromptChip` row (example queries, context-aware), `AIChatBubble` (user + assistant, streamed token-by-token), `ToolCallCard` (collapsible, shows the structured query + result count — the provenance), inline `PlayerCard` results, follow-up action buttons (add to board, compare, generate report).
**Behaviors:** streaming answer; tool-call card appears first (so the user sees *what* it looked at); results are real, clickable player cards; failures degrade gracefully ("couldn't answer — retry") per architecture §11.
**Data:** `aiProvider.answerPortalQuestion`, results hydrated into real `Player` cards via repositories; persisted as `AIInsight`.

### 5.8 Settings

Org settings, user management, Firebase integration status, AI configuration. Vertical tabs left, panel right.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ SETTINGS                                                                     │
│ ──────────────┬─────────────────────────────────────────────────────────────│
│ ◉ Organization│  ORGANIZATION                                              │
│ ◉ Scheme      │  Name [University of Maryland]  Short [Maryland]           │
│ ◉ Users &     │  Conference [Big Ten ▾]  Season [2026]                     │
│   Roles       │  Scholarship limit [85]  Roster limit [105]               │
│ ◉ Integrations│  ─────────────────────────────────────────                │
│ ◉ AI Config   │  SCHEME (drives fit weights)                              │
│ ◉ Board Config│  Offense [SPREAD ▾]   Defense [NICKEL_425 ▾]              │
│               │  ─────────────────────────────────────────                │
│               │  INTEGRATIONS — Data backend                              │
│               │  ● Mock (Phase 1)   ○ Firebase  [● connected / ○ not set] │
│               │  Firebase: project —, auth —, Firestore —  (status pills) │
│               │  ─────────────────────────────────────────                │
│               │  AI CONFIG                                                 │
│               │  Provider ● Mock  ○ Anthropic   Model [claude-opus-4-8 ▾] │
│               │  Confidence display [on]  Provenance [always show]        │
│               │  ─────────────────────────────────────────                │
│               │  USERS & ROLES (table: name · email · role · rooms)       │
│               │  Coach Hill · DB room · POSITION_COACH        [edit]       │
│               │  [+ Invite user]                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

**Panels:** Organization (name, conference, limits), Scheme (offense/defense → fit weights), Users & Roles (table with role + position rooms, invite), Integrations (data backend mock/Firebase with connection status pills — mirrors `di.ts` swap), AI Config (provider mock/Anthropic, model id, confidence/provenance toggles), Board Config (stages, WIP limits).
**Data:** `Organization`, `User[]`, backend/AI env state.

---

## 6. Component Inventory

Reusable components live in `src/components` (domain-agnostic primitives) and `src/features/*/components` (domain components). Brief specs:

| Component | Spec |
|---|---|
| **PlayerCard** | Variants: `list-row` (dense, default), `grid-tile`, `compact` (board/comp). Slots: position pill, name, measurables, school chip, stars, years badge, status, FitScoreBadge, need badge, actions. Position-tinted left border. |
| **FitScoreBadge / dial** | 0–100, gold-ramped (§2.4). Small = pill (`◉91`); large = circular SVG dial with band color + label (ELITE/STARTER…). Tabular numerals. |
| **PositionPill** | Group-colored chip (`[DB]`, `[WR]`). Background = group tint, text = group color. Uppercase display face. |
| **StarRating** | 2–5 gold stars (`md-gold`), half-star support for composite; tnum tooltip showing composite rating. |
| **FilterRail** | Collapsible groups, each with active-count badge; multi-select pills, dual-range sliders, radios. "Clear all" + "Save preset". Draft state in Zustand until applied. |
| **StatTable** | Tabular-numeral table, sticky header (display-face uppercase labels), zebra via `surface-1/2`, right-aligned numbers, position-aware columns. |
| **ComparisonView** | Side-by-side 2–4 players. Column per player; rows = attributes (measurables, stats, fit, eligibility, board status); best-in-row highlighted in gold; radar overlay option. |
| **KanbanColumn** | Header (label + count + WIP), scrollable card list, drop-zone highlight, terminal styling for Committed/Lost. |
| **KanbanCard** | Compact PlayerCard variant for the board; drag handle, assignee, flags, position-tint border. |
| **RadarChart** | SVG spider of position attributes (5–7 axes), gold fill at low alpha; supports overlay of 2 players for compare. |
| **DepthChart** | Ranked roster slots (1=starter…), eligibility class, years badge, departure-risk pill; open slots dashed. |
| **NeedHeatmap** | Grid of positions; cell color = priority (NONE→CRITICAL via gold/red ramp), number = needScore; clickable to drill. |
| **AlertItem** | Icon + message + timestamp; severity-colored left edge (info/risk/danger). Used in dashboard alert feed. |
| **AIChatBubble** | User/assistant variants; assistant streams; supports embedded result cards and action buttons. |
| **ToolCallCard** | Collapsible, mono payload of the structured query + result count; the AI provenance/transparency primitive. |
| **EmptyState** | Icon + headline + subline + optional CTA. Copy is specific ("No entrants match these filters" vs "Board empty — add from portal"). |
| **LoadingSkeleton** | Layout-matched shimmer (rows for tables, cards for board) with subtle flag-gold shimmer accent. |
| **WindowStatusPill** | Window type + days left; urgency-colored (gold ≤7d, red ≤2d). In top bar + sidebar. |

---

## 7. Data Visualization

SVG/Tailwind-first; **no heavy chart libraries** (architecture keeps dependencies light). All charts are simple, readable, and theme-aware via CSS variables.

| Viz | Implementation | Where |
|---|---|---|
| **Radar / spider** | Hand-rolled SVG polygon over 5–7 normalized axes; gold fill `@22% alpha`, `md-gold` stroke. Overlay second polygon (cyan) for compare. | Player profile, ComparisonView |
| **Need heatmap** | CSS grid of cells; background = priority ramp (NONE muted → CRITICAL red), number = needScore. | Team Needs, Dashboard |
| **Percentile bars** | Horizontal track (`surface-2`) + fill colored by band (§2.4); marker for player vs position median. | Measurables, stats |
| **Depth-chart grid** | Stacked rows per depth rank; risk pill + eligibility; open slots dashed border. | Team Needs |
| **Trend sparklines** | Inline SVG polyline (no axes), ~`80×24`, `md-gold` stroke, last point dotted. | Stats by season, KPI cards |
| **Bar (distribution)** | Tailwind flex bars or thin SVG rects; for fit-distribution, eligibility-class distribution. | Reports, Team Needs |
| **Fit dial** | SVG circular arc (0–100 → 0–270°), band color, big tnum number centered. | FitScoreBadge large |

**Rules:** every chart legible at small size; color carries meaning (band/position/status), never decoration; numbers always tabular; charts degrade to a labeled table for accessibility/print.

---

## 8. Interaction & Motion

**Motion budget is tight** — fast and functional, never showy. Durations 120–200ms, `ease-out`. Reduced-motion respected (`prefers-reduced-motion` disables non-essential transitions).

| Interaction | Behavior |
|---|---|
| **Drag-drop (board)** | Lift card (scale 1.02, shadow, 120ms), source column dims, target column highlights with `md-red` dashed edge; **optimistic move** commits instantly, reconciles with server; snap-back + toast on error. Role-gated drops disabled with tooltip. |
| **Hover states** | Rows/cards → `surface-2`; reveal quick-actions (add, compare, assign) that are otherwise hidden to keep density. 120ms. |
| **Filter behavior** | Draft in panel (Zustand) → debounced 250ms apply → live result count → URL-synced (`?pos=CB&years=2`) for shareable views. |
| **Optimistic updates** | Board moves, watchlist add/remove, stage changes apply immediately via React Query optimistic update; rollback on failure. |
| **Compare tray** | Pinning a player slides up a sticky bottom tray; up to 4; "Compare" opens ComparisonView. |
| **Streaming AI** | Tool-call card appears first, then tokens stream into the bubble; result cards hydrate at the end. |

**Keyboard shortcuts**

| Key | Action |
|---|---|
| `⌘K` | Command palette / global search |
| `⌘\` | Collapse/expand sidebar |
| `g` then `d/p/b/n/r/a` | Go to Dashboard/Portal/Board/Needs/Reports/AI |
| `/` | Focus filter search |
| `f` | Toggle filter rail |
| `c` | Add focused player to compare tray |
| `⌘↵` | Submit AI prompt / open in new context |
| `j/k` | Move down/up in lists |
| `Esc` | Close palette/modal/tray |

---

## 9. Responsive & States

**Desktop-first** — this is a war-room tool meant for large monitors. Three breakpoints:

| Range | Layout |
|---|---|
| **≥1440px (war room)** | Full: sidebar + multi-column dashboards, board shows 6–7 columns, profile two-pane. Target experience. |
| **1024–1439px (laptop)** | Sidebar collapses to icon-rail (`⌘\`); board scrolls horizontally; dashboard drops to 2-up; filter rail becomes a toggle drawer. |
| **<1024px (graceful, not primary)** | Single column; sidebar → top drawer; board → one column with stage tabs; profile sections stack; filters in a full-screen sheet. Read-first; drag-drop falls back to a stage dropdown on cards. |

**Loading states** — every React Query consumer renders a layout-matched `LoadingSkeleton` (rows for tables, card grids for the board) so first paint matches final structure. Server Components use route-level `loading.tsx`.

**Empty states** — first-class and *specific* (coverage is the product's value, so "empty" must clearly mean "nothing matched," never "broken"):
- Portal: "No entrants match these filters. — Clear filters."
- Board column: "No prospects here yet. — Add from the portal."
- Team Needs: "No gaps at this position — fully stocked."
- AI: "Ask about the portal, your roster, or a player to begin."

**Error states** — typed domain errors surfaced via `ErrorState` (retry CTA); `app/error.tsx` + `ErrorBoundary` for render failures; AI failures degrade gracefully without blocking the page.

---

## 10. Accessibility

The dark, dense aesthetic must still pass bar:

- **Contrast:** `text-primary` on `surface-1` ≥ 12:1; `text-secondary` ≥ 7:1; `text-muted` ≥ 4.5:1 (used only for non-essential metadata). Status colors paired with **icon/shape + label**, never color alone (e.g. risk = amber bar **+** "MED" text). Position groups paired with the position abbreviation text.
- **Focus:** visible 2px `md-gold` focus ring on all interactive elements (`focus-visible`), never removed; logical tab order; skip-to-content link.
- **Keyboard nav:** all flows operable without a mouse — palette, filters, board (move card via menu when dragging is unavailable), compare, AI. Drag-drop has a keyboard equivalent (focus card → `m` → choose stage).
- **Semantics:** proper landmarks (`nav`, `main`, `aside`), ARIA on the kanban (`role="list"`/`listitem`, `aria-grabbed` during drag), live region announcing optimistic moves and AI streaming completion, `aria-busy` on loading skeletons.
- **Motion:** `prefers-reduced-motion` disables drag-lift scale, streaming animation reduced to instant, sparkline/skeleton shimmer paused.
- **Light/print fallback:** `data-theme="light"` (§2.6) with darkened red/gold for AA on white, used for exported reports and accessibility preference.

---

*End of UI/UX design system. Tokens, wireframes, and component specs above are implementation-ready against the Next.js + Tailwind stack and the domain model in `database-design.md`.*
