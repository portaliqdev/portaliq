"use server";

import { getServices } from "@/lib/di";
import { ORG_ID } from "@/lib/constants";
import type { BoardStage } from "@/types/enums";

export async function addToBoardAction(playerId: string) {
  const entry = await getServices().board.addPlayer(ORG_ID, playerId, "WATCHING");
  return { ok: Boolean(entry) };
}

export async function moveBoardEntryAction(entryId: string, stage: BoardStage, rank: number) {
  try {
    await getServices().board.moveStage(entryId, stage, rank);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
