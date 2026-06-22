import { getRepositories } from "@/lib/di";
import { ORG_ID } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { STAFF_ROLE_LABEL } from "@/types/user";
import { fmt } from "@/lib/utils";
import { Database, Sparkles, CheckCircle2, CircleDashed } from "lucide-react";

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-hairline py-2 last:border-0">
      <span className="text-[12px] text-ink-muted">{label}</span>
      <span className="text-[13px] font-medium text-ink">{value}</span>
    </div>
  );
}

export default async function SettingsPage() {
  const repos = getRepositories();
  const [org, users] = await Promise.all([repos.orgs.getCurrent(), repos.users.listByOrg(ORG_ID)]);
  const dataBackend = process.env.NEXT_PUBLIC_DATA_BACKEND ?? "mock";
  const aiBackend = process.env.NEXT_PUBLIC_AI_BACKEND ?? "mock";

  return (
    <>
      <PageHeader eyebrow="Admin" title="Settings" description="Program configuration, staff, and integration status." />
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
        {/* Program */}
        <Card>
          <CardHeader eyebrow="Program" title="Organization" />
          <div className="px-4 py-1">
            <Field label="Program" value={org.name} />
            <Field label="Conference" value={org.conference} />
            <Field label="Offensive Scheme" value={<Badge tone="red">{org.offenseScheme.replace(/_/g, " ")}</Badge>} />
            <Field label="Defensive Scheme" value={<Badge tone="red">{org.defenseScheme.replace(/_/g, " ")}</Badge>} />
            <Field label="Scholarship Limit" value={org.scholarshipLimit} />
            <Field label="Roster Limit" value={org.rosterLimit} />
            <Field label="NIL Budget" value={`$${fmt((org.nilBudget ?? 0) / 1_000_000, 1)}M`} />
            <Field label="Current Cycle" value={org.currentSeason} />
          </div>
        </Card>

        {/* Integrations */}
        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Phase status" title={<span className="inline-flex items-center gap-1.5"><Database size={14} /> Data Backend</span>} />
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between rounded-md border border-hairline bg-surface-2 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className={dataBackend === "postgres" ? "text-sem-success" : "text-ink-muted"} />
                  <span className="text-[13px] font-medium text-ink">Postgres (Neon) · CFBD data</span>
                </div>
                <Badge tone={dataBackend === "postgres" ? "success" : "neutral"}>{dataBackend === "postgres" ? "Active" : "Idle"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border border-hairline px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <CircleDashed size={16} className="text-ink-muted" />
                  <span className="text-[13px] font-medium text-ink-sub">Mock (in-memory)</span>
                </div>
                <Badge tone={dataBackend === "mock" ? "success" : "neutral"}>{dataBackend === "mock" ? "Active" : "Idle"}</Badge>
              </div>
              <p className="text-[11.5px] text-ink-muted">
                <span className="font-mono text-ink-sub">4,424</span> portal players ingested from CollegeFootballData,
                enriched with 2025 production and scored. Backend selects via <span className="font-mono text-ink-sub">NEXT_PUBLIC_DATA_BACKEND</span>.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="Intelligence" title={<span className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-md-gold" /> AI Configuration</span>} />
            <div className="px-4 py-1">
              <Field label="Provider" value={<Badge tone="gold">{aiBackend === "gemini" ? "Google Gemini" : aiBackend === "anthropic" ? "Anthropic" : "Mock (deterministic)"}</Badge>} />
              <Field label="Model" value={<span className="font-mono text-[12px]">{aiBackend === "gemini" ? "gemini-2.5-flash" : aiBackend === "anthropic" ? "claude-opus-4-8" : "mock-portaliq-v1"}</span>} />
              <Field label="Grounding" value="Strict — retrieval over real player data" />
              <Field label="Used for" value="Assistant · scouting reports · roster needs" />
            </div>
          </Card>
        </div>

        {/* Methodology — how the numbers are computed (defensible, no black box) */}
        <Card className="lg:col-span-2">
          <CardHeader eyebrow="Transparency" title={<span className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-md-gold" /> Scoring Methodology</span>} />
          <div className="grid grid-cols-1 gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "Production Score", d: "0–100 percentile of a player's 2025 box-score output vs. peers at the same position group. Volume + efficiency from CFBD." },
              { k: "Undervaluation", d: "Production percentile minus recruiting-pedigree percentile. Positive = produces above his stars — the Moneyball signal." },
              { k: "Scheme Fit", d: "Maryland-specific: position-group value in our spread/RPO + nickel scheme, adjusted by measurable prototype, production, and runway." },
              { k: "Fit Score", d: "Transparent weighted blend: production 28% · scheme 22% · need 18% · eligibility 16% · pedigree 16%. No black box, no LLM." },
            ].map((m) => (
              <div key={m.k} className="bg-surface px-4 py-3">
                <div className="text-[12px] font-semibold text-ink">{m.k}</div>
                <div className="mt-1 text-[11.5px] leading-snug text-ink-muted">{m.d}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-hairline px-4 py-2.5 text-[11.5px] text-ink-muted">
            Need scores combine roster depth gaps (ideal vs. projected returning) with AI assessment of returning production and confirmed departures. Every score is reproducible from the data — no opaque model output.
          </div>
        </Card>

        {/* Staff */}
        <Card className="lg:col-span-2">
          <CardHeader eyebrow="Access" title="Staff & Roles" />
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-hairline text-left">
                  {["Name", "Role", "Position Rooms", "Email", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-hairline hover:bg-surface-2">
                    <td className="px-4 py-2 font-medium text-ink">{u.displayName}</td>
                    <td className="px-4 py-2 text-ink-sub">{STAFF_ROLE_LABEL[u.role]}</td>
                    <td className="px-4 py-2 text-ink-muted">{u.positionGroups.length ? u.positionGroups.join(", ") : "—"}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-ink-muted">{u.email}</td>
                    <td className="px-4 py-2"><Badge tone={u.isActive ? "success" : "neutral"}>{u.isActive ? "Active" : "Inactive"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
