export const FIRST_NAMES = [
  "Jalen", "Marcus", "Trey", "DeShawn", "Caleb", "Xavier", "Malik", "Jaden",
  "Brock", "Cooper", "Dillon", "Tyrell", "Amari", "Cameron", "Devin", "Isaiah",
  "Jamal", "Keon", "Damon", "Elijah", "Brayden", "Khalil", "Rashad", "Tre",
  "Jordan", "Mason", "Carter", "Drew", "Hunter", "Bryce", "Cade", "Jaylen",
  "Donovan", "Quinn", "Tanner", "Maddox", "Zaire", "Deion", "Anthony", "Gavin",
  "Nico", "Emory", "Shedeur", "Quinshon", "Travis", "Will", "Jeremiah", "Dorian",
  "Omarion", "Kayden", "Braylon", "Jaxon", "Demond", "Terrance", "Roman", "Silas",
  "Princely", "Ladd", "Roman", "Kobe", "Tetairoa", "Ollie", "Bo", "Kaden",
];

export const LAST_NAMES = [
  "Johnson", "Williams", "Brown", "Davis", "Carter", "Mitchell", "Robinson",
  "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott", "Green",
  "Adams", "Baker", "Nelson", "Hill", "Campbell", "Parker", "Edwards", "Collins",
  "Stewart", "Sanchez", "Morris", "Rogers", "Reed", "Cook", "Bell", "Murphy",
  "Bailey", "Rivera", "Cooper", "Richardson", "Cox", "Howard", "Ward", "Torres",
  "Peterson", "Gray", "Ramsey", "James", "Watson", "Brooks", "Sanders", "Price",
  "Bennett", "Wood", "Barnes", "Ross", "Henderson", "Coleman", "Jenkins", "Perry",
  "Powell", "Long", "Patterson", "Hughes", "Washington", "Butler", "Simmons", "Foster",
  "Gonzalez", "Bryant", "Alexander", "Russell", "Griffin", "Diaz", "Hayes", "Myers",
];

// A handful of hometown cities by state for flavor.
export const CITY_BY_STATE: Record<string, string[]> = {
  TX: ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth", "Allen"],
  FL: ["Miami", "Tampa", "Orlando", "Jacksonville", "Fort Lauderdale", "Naples"],
  GA: ["Atlanta", "Savannah", "Macon", "Valdosta", "Columbus"],
  CA: ["Los Angeles", "Long Beach", "Fresno", "Oakland", "San Diego", "Santa Ana"],
  OH: ["Cleveland", "Columbus", "Cincinnati", "Toledo", "Akron"],
  AL: ["Birmingham", "Mobile", "Montgomery", "Huntsville", "Tuscaloosa"],
  LA: ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette"],
  MD: ["Baltimore", "Bethesda", "Bowie", "Hyattsville", "Annapolis"],
  NC: ["Charlotte", "Raleigh", "Greensboro", "Durham", "Fayetteville"],
  MS: ["Jackson", "Gulfport", "Hattiesburg", "Biloxi"],
  NJ: ["Newark", "Camden", "Trenton", "Paterson"],
  VA: ["Virginia Beach", "Richmond", "Norfolk", "Hampton"],
  PA: ["Philadelphia", "Pittsburgh", "Harrisburg", "Allentown"],
  MI: ["Detroit", "Flint", "Grand Rapids", "Ann Arbor"],
  TN: ["Memphis", "Nashville", "Knoxville", "Chattanooga"],
  DEFAULT: ["Springfield", "Riverside", "Franklin", "Clinton", "Madison"],
};

export function cityFor(state: string, pick: <T>(a: readonly T[]) => T): string {
  const cities = CITY_BY_STATE[state] ?? CITY_BY_STATE.DEFAULT;
  return `${pick(cities)}, ${state}`;
}
