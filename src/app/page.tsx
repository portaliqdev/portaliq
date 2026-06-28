"use client";

import Link from "next/link";
import { Reveal } from "@/components/marketing/Reveal";
import { WarRoomPreview } from "@/components/marketing/WarRoomPreview";
import { CountUp } from "@/components/ui/CountUp";
import {
  Radar,
  ArrowRight,
  Columns3,
  Target,
  Sparkles,
  TrendingUp,
  Gauge,
  Database,
  ShieldCheck,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    icon: Radar,
    title: "Live portal intelligence",
    body: "Every entrant, the moment they hit the portal — eligibility, production, and measurables, scouted and ranked.",
  },
  {
    icon: Gauge,
    title: "Transparent fit scoring",
    body: "A defensible 0–100 fit blend: production, scheme, need, eligibility, pedigree. No black box, no hallucinated stats.",
  },
  {
    icon: TrendingUp,
    title: "Moneyball signals",
    body: "Surface players who produce above their recruiting stars — the undervalued targets everyone else overlooks.",
  },
  {
    icon: Sparkles,
    title: "AI recruiting assistant",
    body: "Ask in plain English. Get answers grounded in the real dataset, with the players and the reasoning attached.",
  },
  {
    icon: Target,
    title: "Roster needs engine",
    body: "Per-position need scoring from depth, projected departures, and incoming commits — so you fill the right rooms.",
  },
  {
    icon: Columns3,
    title: "Recruiting board workflow",
    body: "An eight-stage pipeline your whole staff runs together — drag, assign, note, and move with one source of truth.",
  },
];

const STEPS = [
  { n: "01", title: "Ingest the portal", body: "We pull every transfer-portal entrant from CollegeFootballData and enrich them with current-season production." },
  { n: "02", title: "Score the fit", body: "Each player is graded against your scheme, roster needs, and eligibility — reproducible from the data, every time." },
  { n: "03", title: "Run your war room", body: "Build the board, work the pipeline, and ask the assistant. Your staff operates from one decisive command center." },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-canvas text-ink">
      {/* Ambient backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-12%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-brand-500/12 blur-[140px]" />
        <div className="absolute right-[-8%] top-[30%] h-[30rem] w-[30rem] rounded-full bg-amber-500/8 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, black, transparent)",
          }}
        />
      </div>

      {/* Nav */}
      <header className="glass sticky top-0 z-50 border-b border-hairline">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-[#08090c] shadow-glow">
              <Radar size={18} strokeWidth={2.4} />
            </span>
            <span className="font-display text-[19px] font-bold tracking-tight">
              Portal<span className="text-brand-500">IQ</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13.5px] text-ink-sub md:flex">
            <a href="#features" className="transition-colors hover:text-ink">Features</a>
            <a href="#how" className="transition-colors hover:text-ink">How it works</a>
            <a href="#proof" className="transition-colors hover:text-ink">Why trust it</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/sign-in"
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-ink-sub transition-colors hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-in"
              className="group inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-[13px] font-semibold text-[#08090c] transition-[background-color,box-shadow] hover:bg-brand-400 hover:shadow-glow"
            >
              Enter War Room
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-5 pb-10 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center animate-fade-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-1 px-3 py-1 text-[11px] font-medium text-ink-sub">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_6px_var(--brand-500)]" />
            Transfer Portal Intelligence
          </span>
          <h1 className="mt-5 font-display text-[44px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[64px]">
            The transfer portal,
            <br />
            <span className="text-gradient-brand">decoded.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-ink-sub sm:text-[17px]">
            PortalIQ is the recruiting war room for college football — AI-graded portal intelligence,
            transparent fit scoring, and roster strategy that turns chaos into a decisive board.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/sign-in"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-6 text-[15px] font-semibold text-[#08090c] transition-[background-color,box-shadow] hover:bg-brand-400 hover:shadow-glow"
            >
              Enter the War Room
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-hairline-strong bg-surface-1 px-6 text-[15px] font-medium text-ink-sub transition-colors hover:bg-surface-2 hover:text-ink"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Preview */}
        <div className="relative mx-auto mt-14 max-w-4xl animate-fade-up [animation-delay:120ms]">
          <div aria-hidden className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[2rem] bg-brand-500/10 blur-3xl" />
          <WarRoomPreview />
        </div>

        {/* Trust strip */}
        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[12.5px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5"><Database size={14} /> Built on CollegeFootballData</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> Power 4 ready</span>
          <span className="inline-flex items-center gap-1.5"><Zap size={14} /> Scores computed, not guessed</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-3">The platform</div>
          <h2 className="font-display text-[32px] font-bold tracking-tight sm:text-[40px]">
            Everything your staff needs, in one war room
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-sub">
            Six instruments built for the speed of the portal — every one grounded in real data.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 60}>
              <div className="group h-full rounded-2xl border border-hairline bg-surface-1 p-6 shadow-card edge-highlight transition-[transform,border-color,box-shadow] duration-[var(--duration-base)] ease-out hover:-translate-y-1 hover:border-hairline-strong hover:shadow-md">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/12 text-brand-500 ring-1 ring-inset ring-brand-500/25 transition-colors group-hover:bg-brand-500/20">
                  <f.icon size={20} />
                </span>
                <h3 className="mt-4 font-display text-[17px] font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-sub">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative border-y border-hairline bg-base">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className="eyebrow mb-3">How it works</div>
            <h2 className="font-display text-[32px] font-bold tracking-tight sm:text-[40px]">
              From portal chaos to a decisive board
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <div className="relative h-full rounded-2xl border border-hairline bg-surface-1 p-6 edge-highlight">
                  <div className="font-mono text-[13px] font-semibold text-brand-500">{s.n}</div>
                  <h3 className="mt-3 font-display text-[18px] font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-sub">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Proof / stats band */}
      <section id="proof" className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <Reveal className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { value: 4424, label: "Portal players ingested", suffix: "" },
            { value: 100, label: "Fit score, fully transparent", suffix: "%" },
            { value: 8, label: "Pipeline stages, one board", suffix: "" },
            { value: 0, label: "Hallucinated stats", suffix: "" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-hairline bg-surface-1 p-6 text-center edge-highlight">
              <div className="font-display text-[34px] font-bold tracking-tight text-brand-500 tnum sm:text-[40px]">
                <CountUp value={s.value} />
                {s.suffix}
              </div>
              <div className="mt-1.5 text-[12.5px] text-ink-sub">{s.label}</div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Final CTA */}
      <section className="relative mx-auto max-w-6xl px-5 pb-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-hairline-strong bg-surface-1 px-8 py-16 text-center edge-highlight">
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[100px]" />
            <h2 className="relative font-display text-[32px] font-bold tracking-tight sm:text-[44px]">
              Win the portal before signing day.
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-sub">
              Step into a recruiting command center built for Division I programs — and never miss the
              right transfer again.
            </p>
            <Link
              href="/auth/sign-in"
              className="group relative mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-7 text-[15px] font-semibold text-[#08090c] transition-[background-color,box-shadow] hover:bg-brand-400 hover:shadow-glow"
            >
              Enter the War Room
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-500 text-[#08090c]">
              <Radar size={13} strokeWidth={2.4} />
            </span>
            <span className="font-display text-[14px] font-bold tracking-tight">
              Portal<span className="text-brand-500">IQ</span>
            </span>
          </div>
          <p className="text-[12px] text-ink-muted">
            Moneyball for the modern recruiting war room · Phase 1 demo · deterministic dataset
          </p>
        </div>
      </footer>
    </div>
  );
}
