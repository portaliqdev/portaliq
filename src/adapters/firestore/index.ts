/**
 * Firestore adapters — Phase 2 (NOT YET IMPLEMENTED).
 *
 * In Phase 2 each repository interface from `@/repositories` gets a Firestore
 * implementation here (collections, converters running Zod in `fromFirestore`,
 * `query(where(), orderBy())`, `onSnapshot` for live board collaboration), plus
 * a FirebaseAuthAdapter. di.ts already routes here when
 * NEXT_PUBLIC_DATA_BACKEND="firestore" — wiring real Firebase is the entire
 * migration; no feature/service/interface code changes.
 */
import type { Repositories } from "@/repositories";

export function createFirestoreRepositories(): Repositories {
  throw new Error(
    "Firestore backend is not implemented (Phase 2). Set NEXT_PUBLIC_DATA_BACKEND=mock for Phase 1.",
  );
}
