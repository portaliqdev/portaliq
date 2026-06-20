import { z } from "zod";
import { Conference } from "./enums";

export { Conference };
export type { Conference as ConferenceType } from "./enums";

export const Division = z.enum(["FBS", "FCS", "D2", "D3", "JUCO", "NAIA"]);
export type Division = z.infer<typeof Division>;

export const SchoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  mascot: z.string().optional(),
  conference: Conference,
  division: Division,
  state: z.string(),
  logoUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  isPower: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type School = z.infer<typeof SchoolSchema>;

/** Denormalized stamp embedded on players/board entries to avoid extra reads. */
export const SchoolStampSchema = z.object({
  id: z.string(),
  name: z.string(),
  conference: Conference,
  logoUrl: z.string().optional(),
  primaryColor: z.string().optional(),
});
export type SchoolStamp = z.infer<typeof SchoolStampSchema>;
