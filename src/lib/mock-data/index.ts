import { generateMockDB, type MockDB } from "./generate";

/**
 * The Phase-1 in-memory database. Generated once, deterministically, at module
 * load. The mock repository adapters read from this singleton; swapping to
 * Firestore (Phase 2) is a di.ts change and never touches this file.
 */
export const db: MockDB = generateMockDB();

export type { MockDB } from "./generate";
export { applyPlayerFilters } from "./query";
export { SCHOOLS, SCHOOL_BY_ID, MARYLAND } from "./schools";
