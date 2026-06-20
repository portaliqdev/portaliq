import type { School } from "@/types/school";
import type { Conference } from "@/types/enums";
import { POWER_CONFERENCES } from "@/types/enums";

interface SeedSchool {
  name: string;
  mascot: string;
  conf: Conference;
  state: string;
  color: string;
}

// Realistic FBS programs across all relevant conferences. Maryland is the tenant.
const SEED: SeedSchool[] = [
  // Big Ten
  { name: "Maryland", mascot: "Terrapins", conf: "Big Ten", state: "MD", color: "#E21833" },
  { name: "Ohio State", mascot: "Buckeyes", conf: "Big Ten", state: "OH", color: "#BB0000" },
  { name: "Michigan", mascot: "Wolverines", conf: "Big Ten", state: "MI", color: "#00274C" },
  { name: "Penn State", mascot: "Nittany Lions", conf: "Big Ten", state: "PA", color: "#041E42" },
  { name: "Oregon", mascot: "Ducks", conf: "Big Ten", state: "OR", color: "#154733" },
  { name: "USC", mascot: "Trojans", conf: "Big Ten", state: "CA", color: "#990000" },
  { name: "Wisconsin", mascot: "Badgers", conf: "Big Ten", state: "WI", color: "#C5050C" },
  { name: "Iowa", mascot: "Hawkeyes", conf: "Big Ten", state: "IA", color: "#FFCD00" },
  { name: "Michigan State", mascot: "Spartans", conf: "Big Ten", state: "MI", color: "#18453B" },
  { name: "Nebraska", mascot: "Cornhuskers", conf: "Big Ten", state: "NE", color: "#E41C38" },
  { name: "Washington", mascot: "Huskies", conf: "Big Ten", state: "WA", color: "#4B2E83" },
  { name: "Minnesota", mascot: "Golden Gophers", conf: "Big Ten", state: "MN", color: "#7A0019" },
  { name: "Illinois", mascot: "Fighting Illini", conf: "Big Ten", state: "IL", color: "#13294B" },
  { name: "Rutgers", mascot: "Scarlet Knights", conf: "Big Ten", state: "NJ", color: "#CC0033" },
  { name: "Indiana", mascot: "Hoosiers", conf: "Big Ten", state: "IN", color: "#990000" },
  { name: "UCLA", mascot: "Bruins", conf: "Big Ten", state: "CA", color: "#2D68C4" },
  // SEC
  { name: "Georgia", mascot: "Bulldogs", conf: "SEC", state: "GA", color: "#BA0C2F" },
  { name: "Alabama", mascot: "Crimson Tide", conf: "SEC", state: "AL", color: "#9E1B32" },
  { name: "Texas", mascot: "Longhorns", conf: "SEC", state: "TX", color: "#BF5700" },
  { name: "LSU", mascot: "Tigers", conf: "SEC", state: "LA", color: "#461D7C" },
  { name: "Tennessee", mascot: "Volunteers", conf: "SEC", state: "TN", color: "#FF8200" },
  { name: "Ole Miss", mascot: "Rebels", conf: "SEC", state: "MS", color: "#14213D" },
  { name: "Florida", mascot: "Gators", conf: "SEC", state: "FL", color: "#0021A5" },
  { name: "Auburn", mascot: "Tigers", conf: "SEC", state: "AL", color: "#0C2340" },
  { name: "Texas A&M", mascot: "Aggies", conf: "SEC", state: "TX", color: "#500000" },
  { name: "Missouri", mascot: "Tigers", conf: "SEC", state: "MO", color: "#F1B82D" },
  { name: "Oklahoma", mascot: "Sooners", conf: "SEC", state: "OK", color: "#841617" },
  { name: "South Carolina", mascot: "Gamecocks", conf: "SEC", state: "SC", color: "#73000A" },
  { name: "Kentucky", mascot: "Wildcats", conf: "SEC", state: "KY", color: "#0033A0" },
  { name: "Arkansas", mascot: "Razorbacks", conf: "SEC", state: "AR", color: "#9D2235" },
  { name: "Mississippi State", mascot: "Bulldogs", conf: "SEC", state: "MS", color: "#660000" },
  { name: "Vanderbilt", mascot: "Commodores", conf: "SEC", state: "TN", color: "#866D4B" },
  // ACC
  { name: "Florida State", mascot: "Seminoles", conf: "ACC", state: "FL", color: "#782F40" },
  { name: "Clemson", mascot: "Tigers", conf: "ACC", state: "SC", color: "#F56600" },
  { name: "Miami", mascot: "Hurricanes", conf: "ACC", state: "FL", color: "#F47321" },
  { name: "Louisville", mascot: "Cardinals", conf: "ACC", state: "KY", color: "#AD0000" },
  { name: "NC State", mascot: "Wolfpack", conf: "ACC", state: "NC", color: "#CC0000" },
  { name: "North Carolina", mascot: "Tar Heels", conf: "ACC", state: "NC", color: "#7BAFD4" },
  { name: "Virginia Tech", mascot: "Hokies", conf: "ACC", state: "VA", color: "#630031" },
  { name: "Pittsburgh", mascot: "Panthers", conf: "ACC", state: "PA", color: "#003594" },
  { name: "Duke", mascot: "Blue Devils", conf: "ACC", state: "NC", color: "#003087" },
  { name: "SMU", mascot: "Mustangs", conf: "ACC", state: "TX", color: "#0033A0" },
  { name: "California", mascot: "Golden Bears", conf: "ACC", state: "CA", color: "#003262" },
  { name: "Georgia Tech", mascot: "Yellow Jackets", conf: "ACC", state: "GA", color: "#B3A369" },
  { name: "Boston College", mascot: "Eagles", conf: "ACC", state: "MA", color: "#98002E" },
  // Big 12
  { name: "Utah", mascot: "Utes", conf: "Big 12", state: "UT", color: "#CC0000" },
  { name: "Kansas State", mascot: "Wildcats", conf: "Big 12", state: "KS", color: "#512888" },
  { name: "Arizona", mascot: "Wildcats", conf: "Big 12", state: "AZ", color: "#003366" },
  { name: "Iowa State", mascot: "Cyclones", conf: "Big 12", state: "IA", color: "#C8102E" },
  { name: "Kansas", mascot: "Jayhawks", conf: "Big 12", state: "KS", color: "#0051BA" },
  { name: "TCU", mascot: "Horned Frogs", conf: "Big 12", state: "TX", color: "#4D1979" },
  { name: "Baylor", mascot: "Bears", conf: "Big 12", state: "TX", color: "#154734" },
  { name: "Texas Tech", mascot: "Red Raiders", conf: "Big 12", state: "TX", color: "#CC0000" },
  { name: "Oklahoma State", mascot: "Cowboys", conf: "Big 12", state: "OK", color: "#FF7300" },
  { name: "West Virginia", mascot: "Mountaineers", conf: "Big 12", state: "WV", color: "#002855" },
  { name: "Cincinnati", mascot: "Bearcats", conf: "Big 12", state: "OH", color: "#E00122" },
  { name: "UCF", mascot: "Knights", conf: "Big 12", state: "FL", color: "#BA9B37" },
  { name: "Houston", mascot: "Cougars", conf: "Big 12", state: "TX", color: "#C8102E" },
  { name: "Colorado", mascot: "Buffaloes", conf: "Big 12", state: "CO", color: "#CFB87C" },
  // Group of Five
  { name: "Memphis", mascot: "Tigers", conf: "American", state: "TN", color: "#003087" },
  { name: "Tulane", mascot: "Green Wave", conf: "American", state: "LA", color: "#006747" },
  { name: "Army", mascot: "Black Knights", conf: "American", state: "NY", color: "#000000" },
  { name: "Boise State", mascot: "Broncos", conf: "Mountain West", state: "ID", color: "#0033A0" },
  { name: "UNLV", mascot: "Rebels", conf: "Mountain West", state: "NV", color: "#CF0A2C" },
  { name: "Fresno State", mascot: "Bulldogs", conf: "Mountain West", state: "CA", color: "#DB0032" },
  { name: "James Madison", mascot: "Dukes", conf: "Sun Belt", state: "VA", color: "#450084" },
  { name: "Appalachian State", mascot: "Mountaineers", conf: "Sun Belt", state: "NC", color: "#000000" },
  { name: "Louisiana", mascot: "Ragin' Cajuns", conf: "Sun Belt", state: "LA", color: "#CE181E" },
  { name: "Toledo", mascot: "Rockets", conf: "MAC", state: "OH", color: "#15396C" },
  { name: "Miami (OH)", mascot: "RedHawks", conf: "MAC", state: "OH", color: "#B61E2E" },
  { name: "Liberty", mascot: "Flames", conf: "Conference USA", state: "VA", color: "#002D62" },
  { name: "Jacksonville State", mascot: "Gamecocks", conf: "Conference USA", state: "AL", color: "#CC0000" },
  { name: "Notre Dame", mascot: "Fighting Irish", conf: "Independent", state: "IN", color: "#0C2340" },
];

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const NOW = "2026-06-01T00:00:00.000Z";

export const SCHOOLS: School[] = SEED.map((s) => ({
  id: `school_${slugify(s.name)}`,
  name: s.name,
  mascot: s.mascot,
  conference: s.conf,
  division: "FBS",
  state: s.state,
  primaryColor: s.color,
  isPower: POWER_CONFERENCES.includes(s.conf),
  createdAt: NOW,
  updatedAt: NOW,
}));

export const SCHOOL_BY_ID = new Map(SCHOOLS.map((s) => [s.id, s]));
export const MARYLAND = SCHOOLS.find((s) => s.name === "Maryland")!;
