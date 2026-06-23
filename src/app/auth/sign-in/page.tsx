"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/Button";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await signIn.email({ email, password, callbackURL: "/" });
    setPending(false);
    if (error) setError(error.message ?? "Sign-in failed");
    else router.push("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-hairline bg-surface-1 p-6">
        <div>
          <div className="font-display text-xl font-bold text-ink">
            PORTAL<span className="text-md-red">IQ</span>
          </div>
          <p className="mt-1 text-[13px] text-ink-muted">Sign in to your recruiting war room.</p>
        </div>
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} />
        {error && <div className="rounded-md bg-md-red/15 px-3 py-2 text-[12px] text-md-red">{error}</div>}
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-hairline-strong bg-base px-3 py-2 text-[14px] text-ink focus:border-md-red focus:outline-none"
      />
    </label>
  );
}
