import { z } from "zod";
import { Conference, OffenseScheme, DefenseScheme, PositionGroup } from "./enums";

/** RACI staff roles (database-design.md §2.2). Exported as StaffRole for repositories. */
export const StaffRole = z.enum([
  "HEAD_COACH",
  "COORDINATOR",
  "POSITION_COACH",
  "ANALYST",
  "GA",
  "PERSONNEL_DIRECTOR",
  "COMPLIANCE",
  "ADMIN",
  "VIEWER",
]);
export type StaffRole = z.infer<typeof StaffRole>;
export const UserRole = StaffRole;
export type UserRole = StaffRole;

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  HEAD_COACH: "Head Coach",
  COORDINATOR: "Coordinator",
  POSITION_COACH: "Position Coach",
  ANALYST: "Recruiting Analyst",
  GA: "Graduate Assistant",
  PERSONNEL_DIRECTOR: "Dir. of Player Personnel",
  COMPLIANCE: "Compliance",
  ADMIN: "Administrator",
  VIEWER: "Viewer",
};

export const UserSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  email: z.string(),
  displayName: z.string(),
  role: StaffRole,
  positionGroups: z.array(PositionGroup).default([]),
  photoUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  lastLoginAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  schoolId: z.string(),
  conference: Conference,
  offenseScheme: OffenseScheme,
  defenseScheme: DefenseScheme,
  scholarshipLimit: z.number(),
  rosterLimit: z.number(),
  nilBudget: z.number().optional(),
  currentSeason: z.number(),
  settings: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Organization = z.infer<typeof OrganizationSchema>;
