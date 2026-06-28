"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/Button";
import { Radar, Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await signIn.email({ email, password, callbackURL: "/app" });
    setPending(false);
    if (error) setError(error.message ?? "Sign-in failed");
    else router.push("/app");
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-canvas px-4">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-[12px] text-ink-muted transition-colors hover:text-ink">
          <ArrowLeft size={13} /> Back to home
        </Link>

        {/* Brand */}
        <div className="mb-6 flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-[#08090c] shadow-glow">
            <Radar size={20} strokeWidth={2.4} />
          </span>
          <span className="font-display text-[22px] font-bold tracking-tight text-ink">
            Portal<span className="text-brand-500">IQ</span>
          </span>
        </div>

        <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">Welcome back</h1>
        <p className="mt-1 text-[13.5px] text-ink-sub">Sign in to your recruiting war room.</p>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-4 rounded-2xl border border-hairline bg-surface-1 p-6 shadow-lg edge-highlight"
        >
          <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />

          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Password</span>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-hairline-strong bg-surface-3 px-3 pr-10 text-[14px] text-ink placeholder:text-ink-muted transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-ink"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-sem-danger/30 bg-sem-danger/10 px-3 py-2 text-[12px] text-sem-danger"
            >
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" loading={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-center text-[12px] text-ink-muted">
            Demo access provisioned by your program admin.
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</span>
      <input
        id={id}
        type={type}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-hairline-strong bg-surface-3 px-3 text-[14px] text-ink placeholder:text-ink-muted transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
    </label>
  );
}
