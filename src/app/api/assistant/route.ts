import { NextResponse } from "next/server";
import { getServices } from "@/lib/di";

export const dynamic = "force-dynamic";

/**
 * AI assistant endpoint. Real LLM calls (Phase 2) run server-side only — this
 * route is where Anthropic (Opus 4.8) would be invoked, keeping keys off the
 * client. Phase 1 returns deterministic, grounded mock answers.
 */
export async function POST(req: Request) {
  let question = "";
  try {
    const body = await req.json();
    question = (body?.question ?? "").toString();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!question.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  const services = getServices();
  const answer = await services.ai.answerQuery({ question });
  const players = await services.search.compare(answer.playerIds);
  return NextResponse.json({ answer, players, model: services.ai.model });
}
