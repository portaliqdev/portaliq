/**
 * CFBD → PortalIQ domain mapping for the transfer-portal ingest.
 *
 * The portal feed is thin (name, position, origin/destination, stars, rating,
 * transferDate) and has NO player id and NO conference on schools. So we:
 *   - synthesize deterministic ids from stable fields,
 *   - resolve schools through a directory built from CFBD /teams/fbs,
 *   - fill schema-required fields the feed lacks with neutral placeholders
 *     (height/weight, eligibility) that roster/stats enrichment overwrites later.
 *
 * Every produced object is validated against the Zod schemas in run.ts before
 * it touches Postgres.
 */
import { ORG_ID, CURRENT_SEASON } from "@/lib/constants";
import { POSITION_META, positionGroup } from "@/types/enums";
import type { PositionCode } from "@/types/enums";
import type { Player } from "@/types/player";
import type { TransferEntry } from "@/types/stats";
import type { School, SchoolStamp } from "@/types/school";
import {
  computeEffectiveAvailability,
  availabilityPatch,
} from "@/services/availability.service";
import type { CfbdPortalEntry } from "./cfbd-client";

const PLACEHOLDER = "__PLACEHOLDER__"; // marks fields awaiting roster enrichment

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ── position normalization (CFBD codes → PositionCode enum) ─────────────── */
const POSITION_ALIASES: Record<string, PositionCode> = {
  IOL: "OG", // interior OL
  OL: "OT",
  DL: "DT",
  DB: "CB",
  PK: "K",
  ATH: "WR", // generic athlete — neutral default
};

export function normalizePosition(raw: string | null): PositionCode {
  const v = (raw ?? "").toUpperCase();
  if (v in POSITION_META) return v as PositionCode;
  return POSITION_ALIASES[v] ?? "WR";
}

/* ── conference normalization (CFBD names → Conference enum) ──────────────── */
const CONFERENCE_ALIASES: Record<string, string> = {
  "Mid-American": "MAC",
  "American Athletic": "American",
  "FBS Independents": "Independent",
};
const KNOWN_CONFERENCES = new Set([
  "Big Ten", "SEC", "ACC", "Big 12", "American", "Mountain West",
  "Sun Belt", "MAC", "Conference USA", "Pac-12", "Independent",
]);

function normalizeConference(raw: string | null | undefined): string {
  const v = CONFERENCE_ALIASES[raw ?? ""] ?? raw ?? "Independent";
  return KNOWN_CONFERENCES.has(v) ? v : "Independent";
}

/* ── school directory ─────────────────────────────────────────────────────
 * Built from CFBD /teams/fbs. Resolves a school *name* (as it appears in the
 * portal feed) to a full School row + a denormalized SchoolStamp. Names not in
 * the FBS set (FCS/lower origins) get a minimal placeholder school. */
export interface CfbdTeam {
  school: string;
  mascot: string | null;
  conference: string | null;
  color: string | null;
  logos: string[] | null;
  location: { state: string | null } | null;
}

export class SchoolDirectory {
  private byName = new Map<string, School>();
  private now = new Date().toISOString();

  constructor(teams: CfbdTeam[]) {
    for (const t of teams) {
      const conference = normalizeConference(t.conference);
      const school: School = {
        id: `school_${slug(t.school)}`,
        name: t.school,
        mascot: t.mascot ?? undefined,
        conference: conference as School["conference"],
        division: "FBS",
        state: t.location?.state ?? "",
        logoUrl: t.logos?.[0] ?? undefined,
        primaryColor: t.color ?? undefined,
        isPower: ["Big Ten", "SEC", "ACC", "Big 12"].includes(conference),
        createdAt: this.now,
        updatedAt: this.now,
      };
      this.byName.set(t.school.toLowerCase(), school);
    }
  }

  /** Resolve a portal-feed school name, minting an FCS-tier placeholder if unknown. */
  resolve(name: string | null): School | null {
    if (!name) return null;
    const hit = this.byName.get(name.toLowerCase());
    if (hit) return hit;
    const placeholder: School = {
      id: `school_${slug(name)}`,
      name,
      conference: "Independent",
      division: "FCS",
      state: "",
      isPower: false,
      createdAt: this.now,
      updatedAt: this.now,
    };
    this.byName.set(name.toLowerCase(), placeholder);
    return placeholder;
  }

  stamp(school: School): SchoolStamp {
    return {
      id: school.id,
      name: school.name,
      conference: school.conference,
      logoUrl: school.logoUrl,
      primaryColor: school.primaryColor,
    };
  }

  /** All schools referenced so far (FBS + minted placeholders) for upsert. */
  all(): School[] {
    return [...this.byName.values()];
  }
}

/* ── status / window derivation ───────────────────────────────────────────── */
function derivePortalStatus(e: CfbdPortalEntry): Player["portalStatus"] {
  if (e.eligibility === "Withdrawn") return "WITHDRAWN";
  if (e.destination) return "COMMITTED";
  return "IN_PORTAL";
}

function deriveWindow(transferDate: string | null): TransferEntry["windowType"] {
  if (!transferDate) return "EXCEPTION";
  const m = new Date(transferDate).getUTCMonth(); // 0-11
  if (m === 11 || m === 0 || m === 1) return "WINTER"; // Dec–Feb
  if (m >= 2 && m <= 5) return "SPRING"; // Mar–Jun
  return "EXCEPTION";
}

/* ── the mapping ──────────────────────────────────────────────────────────── */
export interface MappedEntry {
  player: Player;
  transfer: TransferEntry;
}

export function mapPortalEntry(e: CfbdPortalEntry, dir: SchoolDirectory): MappedEntry | null {
  const origin = dir.resolve(e.origin);
  if (!origin) return null; // can't place a player with no origin school

  const destination = dir.resolve(e.destination);
  const pos = normalizePosition(e.position);
  const group = positionGroup(pos);
  const fullName = `${e.firstName} ${e.lastName}`.trim();
  const now = new Date().toISOString();

  // Deterministic, collision-resistant id from stable fields.
  const id = `player_${slug(`${e.firstName}-${e.lastName}-${e.origin ?? ""}-${pos}`)}_26`;

  // CFBD is the raw layer. A fresh portal entry has only this layer, so the
  // availability service resolves effective = raw / source CFBD. Staff overrides
  // and roster checks (held in their own layers) are preserved on re-ingest.
  const rawStatus = derivePortalStatus(e);
  const rawAt = e.transferDate ?? now;
  const availState = { raw: rawStatus, rawUpdatedAt: rawAt };
  const effective = computeEffectiveAvailability(availState, Date.parse(now));
  const avail = availabilityPatch(availState, effective, now);
  const portalStatus = effective.status;

  const player: Player = {
    id,
    orgId: ORG_ID,
    firstName: e.firstName,
    lastName: e.lastName,
    fullName,
    currentSchoolId: origin.id,
    currentSchool: dir.stamp(origin),
    previousSchoolIds: [],
    primaryPosition: pos,
    secondaryPositions: [],
    positionGroup: group,
    heightInches: 0, // enriched from roster later
    weightLbs: 0, // enriched from roster later
    stars: e.stars ?? 0,
    compositeRating: e.rating ?? 0,
    eligibilityClass: "JR", // placeholder — roster enrichment overwrites
    eligibility: {
      seasonsAllowed: 4,
      seasonsUsed: 0,
      redshirtUsed: false,
      extraYears: 0,
      yearsRemaining: 1,
      isGraduate: false,
    },
    scholarshipStatus: "SCHOLARSHIP",
    ...avail,
    portalStatus,
    awards: [],
    injuryFlags: [],
    characterFlags: [],
    watchlistIds: [],
    tags: ["cfbd-portal-2026"],
    createdAt: now,
    updatedAt: now,
  };

  const transfer: TransferEntry = {
    id: `te_${id}`,
    orgId: ORG_ID,
    playerId: id,
    fromSchoolId: origin.id,
    fromSchoolName: origin.name,
    status: portalStatus ?? "IN_PORTAL",
    windowType: deriveWindow(e.transferDate),
    seasonYear: CURRENT_SEASON,
    enteredAt: e.transferDate ?? now,
    committedToSchoolId: destination?.id,
    committedToSchoolName: destination?.name,
    committedAt: e.destination ? e.transferDate ?? undefined : undefined,
    isGradTransfer: false,
    outgoing: false,
    statusHistory: [{ status: portalStatus ?? "IN_PORTAL", at: e.transferDate ?? now, source: "CFBD" }],
    createdAt: now,
    updatedAt: now,
  };

  return { player, transfer };
}

export { PLACEHOLDER };
