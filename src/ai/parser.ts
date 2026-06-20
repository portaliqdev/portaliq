/**
 * Deterministic natural-language parser (ai-system-design.md §10).
 * Phase 1 has no LLM: this rule-based parser maps a recruiting question to the
 * same structured PlayerFilters the Phase-2 tool-calling assistant would emit.
 */
import type { PlayerFilters } from "@/types/player";
import type { PositionCode, Conference } from "@/types/enums";

export type QueryIntent =
  | "search"
  | "scheme"
  | "undervalued"
  | "similar"
  | "compare"
  | "follow_up_today"
  | "uncontacted_targets"
  | "unowned_priority"
  | "board_summary"
  | "evaluated_to_watchlist";

export interface ParsedQuery {
  filters: PlayerFilters;
  intent: QueryIntent;
  notes: string[];
  limit: number;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
};

const POSITION_PHRASES: [RegExp, PositionCode[], string][] = [
  [/offensive tackles?|\bot\b|left tackles?|right tackles?/, ["OT"], "offensive tackles"],
  [/wide receivers?|receivers?|\bwr\b|wideouts?/, ["WR"], "wide receivers"],
  [/running backs?|\brb\b|tailbacks?/, ["RB"], "running backs"],
  [/quarterbacks?|\bqb\b|signal.callers?/, ["QB"], "quarterbacks"],
  [/tight ends?|\bte\b/, ["TE"], "tight ends"],
  [/linebackers?|\blb\b|\bilb\b|\bolb\b/, ["LB", "ILB", "OLB"], "linebackers"],
  [/cornerbacks?|corners?|\bcb\b/, ["CB"], "cornerbacks"],
  [/safet(?:y|ies)|\bfs\b|\bss\b/, ["S"], "safeties"],
  [/nickel(?:backs?)?|\bnb\b/, ["NB"], "nickels"],
  [/edge rushers?|edge defenders?|\bedge\b|pass rushers?/, ["EDGE"], "edge rushers"],
  [/defensive tackles?|\bdt\b|nose tackles?|\bnt\b/, ["DT", "NT"], "interior D-line"],
  [/guards?|\bog\b/, ["OG"], "guards"],
  [/centers?\b/, ["C"], "centers"],
  [/kickers?\b/, ["K"], "kickers"],
  [/punters?\b/, ["P"], "punters"],
  [/defensive backs?|\bdb\b|secondary/, ["CB", "S", "NB"], "defensive backs"],
];

const CONFERENCE_PHRASES: [RegExp, Conference][] = [
  [/\bsec\b/, "SEC"],
  [/big ten|b1g|big.10/, "Big Ten"],
  [/\bacc\b/, "ACC"],
  [/big 12|big twelve/, "Big 12"],
];

export function parseQuery(raw: string): ParsedQuery {
  const q = raw.toLowerCase();
  const filters: PlayerFilters = {};
  const notes: string[] = [];
  let intent: QueryIntent = "search";

  // Positions
  const positions = new Set<PositionCode>();
  let posLabel = "";
  for (const [re, codes, label] of POSITION_PHRASES) {
    if (re.test(q)) {
      codes.forEach((c) => positions.add(c));
      if (!posLabel) posLabel = label;
    }
  }
  if (positions.size) {
    filters.positions = [...positions];
    notes.push(`position = ${posLabel}`);
  }

  // Conferences / power
  const confs = new Set<Conference>();
  for (const [re, conf] of CONFERENCE_PHRASES) if (re.test(q)) confs.add(conf);
  if (confs.size) {
    filters.conferences = [...confs];
    notes.push(`conference = ${[...confs].join(", ")}`);
  }
  if (/power (?:4|four)|\bp4\b|power conference/.test(q)) {
    filters.powerOnly = true;
    notes.push("Power-4 only");
  }
  if (/group of five|\bg5\b|mid.major/.test(q)) {
    notes.push("Group of Five");
  }

  // Years of eligibility remaining
  const yearsMatch = q.match(/(\d+|one|two|three|four|five)\s*(?:\+)?\s*years?\s*(?:of\s*)?(?:eligibility\s*)?(?:remaining|left|of eligibility)?/);
  if (yearsMatch && /eligibility|remaining|left|years/.test(q)) {
    const n = NUMBER_WORDS[yearsMatch[1]] ?? parseInt(yearsMatch[1], 10);
    if (!Number.isNaN(n) && n >= 0 && n <= 5) {
      filters.minYearsRemaining = n;
      notes.push(`≥ ${n} years remaining`);
    }
  }

  // Weight thresholds
  const underWeight = q.match(/under (\d{3})\s*(?:pounds|lbs|lb)/);
  if (underWeight) {
    filters.maxWeightLbs = parseInt(underWeight[1], 10);
    notes.push(`≤ ${underWeight[1]} lb`);
  }
  const overWeight = q.match(/over (\d{3})\s*(?:pounds|lbs|lb)/);
  if (overWeight) {
    filters.minWeightLbs = parseInt(overWeight[1], 10);
    notes.push(`≥ ${overWeight[1]} lb`);
  }

  // Star floor
  const starMatch = q.match(/(\d)\s*star/);
  if (starMatch) {
    filters.minStars = parseInt(starMatch[1], 10);
    notes.push(`≥ ${starMatch[1]}★`);
  }

  // Workflow intent detection takes precedence over player-search phrasing.
  if (
    /follow[\s-]?ups?|follow up|contact (?:due|needed)|needs? (?:a )?(?:call|text|follow[\s-]?up)/.test(q)
    && /\btoday\b|due|needs?/.test(q)
  ) {
    intent = "follow_up_today";
    notes.push("follow-up due today");
  } else if (
    /uncontacted|not (?:yet )?contacted|haven'?t (?:been )?contacted|without (?:a )?contact/.test(q)
  ) {
    intent = "uncontacted_targets";
    notes.push("no recorded contact");
  } else if (
    /(?:high[\s-]?priority|priority).*(?:no owner|unowned|unassigned|without (?:an )?owner)|(?:no owner|unowned|unassigned|without (?:an )?owner).*(?:high[\s-]?priority|priority)/.test(q)
  ) {
    intent = "unowned_priority";
    notes.push("high priority with no owner");
  } else if (
    /summari[sz]e|summary|overview|breakdown/.test(q)
    && /board|pipeline/.test(q)
  ) {
    intent = "board_summary";
    notes.push("recruiting board summary");
  } else if (
    /(?:move|promote|advance|should (?:be|we)).*(?:evaluated|evaluating).*(?:watchlist|watch list|watching)|(?:evaluated|evaluating).*(?:move|promote|advance|should (?:be|we)).*(?:watchlist|watch list|watching)/.test(q)
  ) {
    intent = "evaluated_to_watchlist";
    notes.push("evaluated players recommended for watchlist");
  } else if (/undervalued|overlooked|outperform|sleeper|moneyball|hidden|underrated/.test(q)) {
    intent = "undervalued";
    filters.undervaluedOnly = true;
    filters.sortBy = "undervaluation";
    notes.push("ranked by undervaluation");
  } else if (/similar|comparable|like our|plays like|compares? to/.test(q)) {
    intent = "similar";
  } else if (/\bcompare\b|versus|side.by.side|head.to.head/.test(q)) {
    intent = "compare";
  } else if (/scheme|fit (?:our|maryland)|system fit|best fit/.test(q)) {
    intent = "scheme";
    filters.sortBy = "fitScore";
    notes.push("ranked by scheme fit");
  }

  if (!filters.sortBy) filters.sortBy = intent === "undervalued" ? "undervaluation" : "fitScore";
  filters.sortDir = "desc";

  // Only IN_PORTAL players are recruitable targets unless asking broadly.
  // Workflow tools use board/contact records and must not receive this implicit
  // search-only constraint.
  const workflowIntent = [
    "follow_up_today",
    "uncontacted_targets",
    "unowned_priority",
    "board_summary",
    "evaluated_to_watchlist",
  ].includes(intent);
  if (!workflowIntent && !/committed|enrolled|withdrawn|all players/.test(q)) {
    filters.portalStatuses = ["IN_PORTAL"];
  }

  const limit = intent === "compare" ? 3 : intent === "board_summary" ? 20 : 10;
  return { filters, intent, notes, limit };
}
