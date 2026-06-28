"use client";

import { useRef, useState } from "react";
import type { Player } from "@/types/player";
import type { AssistantAnswer } from "@/types/ai";
import { PlayerCard } from "@/components/domain/PlayerCard";
import { Kbd } from "@/components/ui/Kbd";
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
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }));
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
      <div className="flex items-center gap-2.5 border-b border-hairline bg-base px-6 py-5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30">
          <Sparkles size={18} />
        </span>
        <div>
          <div className="eyebrow">Intelligence</div>
          <h1 className="font-display text-[22px] font-bold tracking-tight text-ink">AI Recruiting Assistant</h1>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6">
          {messages.length === 0 && (
            <div className="py-8 animate-fade-up">
              <p className="text-center text-[14px] text-ink-sub">
                Ask in plain English. Answers are grounded in the portal dataset — no invented stats.
              </p>
              <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-2 stagger sm:grid-cols-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => send(ex)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-hairline bg-surface-1 px-3 py-2.5 text-left text-[13px] text-ink-sub transition-colors hover:border-brand-500/50 hover:bg-surface-2 hover:text-ink"
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
                <div key={m.id} className="flex justify-end animate-fade-up">
                  <div className="flex max-w-[80%] items-start gap-2">
                    <div className="rounded-xl rounded-tr-sm bg-brand-500 px-3 py-2 text-[13.5px] font-medium text-[#08090c]">{m.text}</div>
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-ink-muted"><User size={13} /></div>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-2.5 animate-fade-up">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/25"><Sparkles size={14} /></div>
                  <div className="min-w-0 flex-1 space-y-3">
                    {m.text && <div className="text-[13.5px] text-ink-sub">{m.text}</div>}
                    {m.answer && (
                      <>
                        <div className="text-[13.5px] leading-relaxed text-ink-sub"><Rich text={m.answer.answer} /></div>

                        {m.answer.toolCalls.length > 0 && (
                          <div className="space-y-1.5">
                            {m.answer.toolCalls.map((tc, i) => (
                              <div key={i} className="flex items-center gap-2 rounded-lg border border-hairline bg-surface-1 px-2.5 py-1.5 font-mono text-[11px]">
                                <Terminal size={12} className="shrink-0 text-amber-400" />
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
                              <button key={f} onClick={() => send(f)} className="rounded-full border border-hairline bg-surface-2 px-2.5 py-1 text-[11.5px] text-ink-sub transition-colors hover:border-hairline-strong hover:text-ink">
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
              <div className="flex items-center gap-2.5 animate-fade-in">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/25"><Sparkles size={14} /></div>
                <div className="flex items-center gap-1 rounded-xl rounded-tl-sm border border-hairline bg-surface-1 px-3 py-2.5">
                  <span className="h-1.5 w-1.5 animate-blink rounded-full bg-ink-muted" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-blink rounded-full bg-ink-muted" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-blink rounded-full bg-ink-muted" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="glass border-t border-hairline px-6 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <div className="relative flex-1">
            <textarea
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about the transfer portal…"
              className="max-h-40 min-h-[44px] w-full resize-none rounded-xl border border-hairline-strong bg-surface-1 px-4 py-3 pr-16 text-[14px] text-ink placeholder:text-ink-muted focus:border-brand-500 focus:outline-none"
            />
            <span className="pointer-events-none absolute bottom-2.5 right-3 hidden items-center gap-1 text-[10px] text-ink-muted sm:flex">
              <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd>
            </span>
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-[#08090c] transition-[background-color,box-shadow] hover:bg-brand-400 hover:shadow-glow disabled:opacity-40 disabled:hover:shadow-none",
            )}
          >
            <Send size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}
