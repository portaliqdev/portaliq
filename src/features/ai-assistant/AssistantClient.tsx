"use client";

import { useRef, useState } from "react";
import type { Player } from "@/types/player";
import type { AssistantAnswer } from "@/types/ai";
import { PlayerCard } from "@/components/domain/PlayerCard";
import { cn } from "@/lib/utils";
import { Sparkles, Send, Terminal, ArrowUpRight, User } from "lucide-react";

const EXAMPLES = [
  "Find Power 4 linebackers with 2 years eligibility remaining",
  "Who is most undervalued?",
  "Show me all SEC offensive tackles under 310 pounds",
  "Find portal WRs who outperform their recruiting ranking",
  "Who fits Maryland's defensive scheme best?",
  "Compare the top 3 safeties",
];

interface Msg {
  id: string;
  role: "user" | "assistant";
  text?: string;
  answer?: AssistantAnswer;
  players?: Player[];
}

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <p key={i} className={i > 0 ? "mt-1.5" : ""}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </p>
      ))}
    </>
  );
}

export function AssistantClient() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    const userMsg: Msg = { id: `u${Date.now()}`, role: "user", text: question };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { id: `a${Date.now()}`, role: "assistant", answer: data.answer, players: data.players ?? [] },
      ]);
    } catch {
      setMessages((m) => [...m, { id: `e${Date.now()}`, role: "assistant", text: "Something went wrong reaching the assistant." }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }));
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-hairline bg-base px-6 py-4">
        <Sparkles size={18} className="text-md-gold" />
        <div>
          <div className="eyebrow">Intelligence</div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-ink">AI Recruiting Assistant</h1>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6">
          {messages.length === 0 && (
            <div className="py-8">
              <p className="text-center text-[14px] text-ink-sub">
                Ask in plain English. Answers are grounded in the portal dataset — no invented stats.
              </p>
              <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => send(ex)}
                    className="flex items-center justify-between gap-2 rounded-md border border-hairline bg-surface-1 px-3 py-2.5 text-left text-[13px] text-ink-sub transition-colors hover:border-md-red hover:text-ink"
                  >
                    {ex}
                    <ArrowUpRight size={14} className="shrink-0 text-ink-muted" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-5">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="flex max-w-[80%] items-start gap-2">
                    <div className="rounded-lg rounded-tr-sm bg-md-red px-3 py-2 text-[13.5px] text-white">{m.text}</div>
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-ink-muted"><User size={13} /></div>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-md-gold/15 text-md-gold"><Sparkles size={14} /></div>
                  <div className="min-w-0 flex-1 space-y-3">
                    {m.text && <div className="text-[13.5px] text-ink-sub">{m.text}</div>}
                    {m.answer && (
                      <>
                        <div className="text-[13.5px] leading-relaxed text-ink-sub"><Rich text={m.answer.answer} /></div>

                        {m.answer.toolCalls.length > 0 && (
                          <div className="space-y-1.5">
                            {m.answer.toolCalls.map((tc, i) => (
                              <div key={i} className="flex items-center gap-2 rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 font-mono text-[11px]">
                                <Terminal size={12} className="shrink-0 text-md-gold" />
                                <span className="font-semibold text-ink">{tc.tool}</span>
                                <span className="truncate text-ink-muted">({Object.keys(tc.args).length ? JSON.stringify(tc.args).slice(0, 60) : ""})</span>
                                <span className="ml-auto shrink-0 text-ink-muted">→ {tc.resultSummary}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {m.players && m.players.length > 0 && (
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {m.players.slice(0, 6).map((p) => (
                              <PlayerCard key={p.id} player={p} />
                            ))}
                          </div>
                        )}

                        {m.answer.followUps.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {m.answer.followUps.map((f) => (
                              <button key={f} onClick={() => send(f)} className="rounded-full border border-hairline-strong bg-surface-2 px-2.5 py-1 text-[11.5px] text-ink-sub hover:text-ink">
                                {f}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ),
            )}
            {loading && (
              <div className="flex items-center gap-2 text-[13px] text-ink-muted">
                <Sparkles size={14} className="animate-pulse text-md-gold" /> Analyzing the portal…
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-hairline bg-base px-6 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mx-auto flex max-w-3xl items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the transfer portal…"
            className="h-11 flex-1 rounded-lg border border-hairline-strong bg-surface-1 px-4 text-[14px] focus:border-md-red focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-lg bg-md-red text-white transition-colors hover:bg-md-red-hover disabled:opacity-40",
            )}
          >
            <Send size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}
