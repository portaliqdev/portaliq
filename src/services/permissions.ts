import type { StaffRole } from "@/types/user";
import type { BoardStage } from "@/types/enums";

/**
 * Board stage-transition permissions (database-design.md §2.2 RACI).
 * Only the head coach extends offers; coordinators+ lock commitments; analysts
 * and above can move within the evaluation pipeline; viewers cannot move cards.
 */
export function canMoveToStage(role: StaffRole, stage: BoardStage): boolean {
  if (role === "VIEWER") return false;
  if (stage === "OFFER_EXTENDED") return role === "HEAD_COACH" || role === "ADMIN";
  if (stage === "COMMITTED") {
    return ["HEAD_COACH", "COORDINATOR", "PERSONNEL_DIRECTOR", "ADMIN"].includes(role);
  }
  // Needs Review / Evaluating / Contacted / Mutual Interest / Visit Scheduled /
  // Lost — any non-viewer staff may move cards within the pipeline.
  return true;
}

export class PermissionError extends Error {
  constructor(role: StaffRole, stage: BoardStage) {
    super(`Role ${role} is not permitted to move a prospect to ${stage}.`);
    this.name = "PermissionError";
  }
}

export function assertCanTransition(role: StaffRole, stage: BoardStage): void {
  if (!canMoveToStage(role, stage)) throw new PermissionError(role, stage);
}
