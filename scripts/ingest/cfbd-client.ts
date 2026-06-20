/**
 * Thin typed wrapper over the CollegeFootballData API (collegefootballdata.com).
 *
 * Auth: Bearer CFBD_API_KEY. No SDK — just fetch + narrow return types for the
 * endpoints the PortalIQ ingestion pipeline needs. Raw shapes here; mapping to
 * the domain Zod types happens in map.ts (Phase 2).
 */
const BASE = "https://api.collegefootballdata.com";

function key(): string {
  const k = process.env.CFBD_API_KEY;
  if (!k) throw new Error("CFBD_API_KEY is not set — add it to .env.local");
  return k;
}

async function cfbd<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const url = `${BASE}${path}?${qs.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key()}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CFBD ${path} → ${res.status} ${res.statusText} ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/* ── Raw CFBD response shapes (subset of fields we consume) ───────────────── */

export interface CfbdPortalEntry {
  season: number;
  firstName: string;
  lastName: string;
  position: string | null;
  origin: string | null; // school transferring FROM
  destination: string | null; // school transferring TO (null if uncommitted)
  transferDate: string | null;
  rating: number | null; // 247-style composite
  stars: number | null;
  eligibility: string | null;
}

export interface CfbdRosterPlayer {
  id: string;
  first_name: string;
  last_name: string;
  team: string;
  position: string | null;
  height: number | null; // inches
  weight: number | null; // lbs
  jersey: number | null;
  year: number | null; // class (1-5)
  home_city: string | null;
  home_state: string | null;
  recruit_ids: string[] | null;
}

export interface CfbdTeamRaw {
  id: number;
  school: string;
  mascot: string | null;
  conference: string | null;
  color: string | null;
  logos: string[] | null;
  location: { state: string | null } | null;
}

export interface CfbdSeasonStat {
  playerId: string;
  player: string;
  team: string;
  conference: string;
  category: string; // e.g. "passing", "rushing", "receiving"
  statType: string; // e.g. "YDS", "TD", "ATT"
  stat: number;
  season: number;
}

/* ── Endpoints ───────────────────────────────────────────────────────────── */

/** Transfer portal entries for a season — the core PortalIQ feed. */
export const getPortal = (year: number) =>
  cfbd<CfbdPortalEntry[]>("/player/portal", { year });

/** Full roster for a team (and optional year) — all players, all positions. */
export const getRoster = (team: string, year?: number) =>
  cfbd<CfbdRosterPlayer[]>("/roster", { team, year });

/** Season player stats (production signal for the AI evaluator). */
export const getSeasonStats = (year: number, opts: { team?: string } = {}) =>
  cfbd<CfbdSeasonStat[]>("/stats/player/season", { year, team: opts.team });

/** FBS team directory — name → conference / state / colors (school resolution). */
export const getFbsTeams = (year: number) =>
  cfbd<CfbdTeamRaw[]>("/teams/fbs", { year });
