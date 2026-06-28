import type { ScoutingReportOutput } from "@/types/ai";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TierBadge } from "@/components/domain/StatusBadge";
import { Sparkles, Check, AlertTriangle, ShieldAlert } from "lucide-react";

const CONF_TONE = { HIGH: "success", MED: "gold", LOW: "neutral" } as const;

function BulletList({
  items,
  icon: Icon,
  color,
}: {
  items: string[];
  icon: typeof Check;
  color: string;
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2 text-[13px] text-ink-sub">
          <Icon size={14} style={{ color }} className="mt-0.5 shrink-0" />
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

export function ScoutingReportCard({
  report,
  model,
}: {
  report: ScoutingReportOutput;
  model: string;
}) {
  return (
    <Card>
      <CardHeader
        eyebrow="Generated · grounded in player data"
        title={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={15} className="text-md-gold" /> AI Scouting Report
          </span>
        }
        action={<Badge tone={CONF_TONE[report.confidence]}>{report.confidence} confidence</Badge>}
      />
      <div className="space-y-4 p-4">
        <p className="text-[13.5px] leading-relaxed text-ink-sub">{report.summary}</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div className="eyebrow mb-2 text-sem-success">Strengths</div>
            <BulletList items={report.strengths} icon={Check} color="#16a34a" />
          </div>
          <div>
            <div className="eyebrow mb-2 text-sem-risk">Weaknesses</div>
            <BulletList items={report.weaknesses} icon={AlertTriangle} color="#d97706" />
          </div>
          <div>
            <div className="eyebrow mb-2 text-sem-danger">Risk Factors</div>
            <BulletList items={report.riskFactors} icon={ShieldAlert} color="#dc2626" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-hairline bg-surface-2 p-3">
            <div className="eyebrow mb-1">Scheme Fit</div>
            <p className="text-[12.5px] text-ink-sub">{report.schemeFit}</p>
          </div>
          <div className="rounded-md border border-hairline bg-surface-2 p-3">
            <div className="eyebrow mb-1">Development Potential</div>
            <p className="text-[12.5px] text-ink-sub">{report.developmentPotential}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-md-red/30 bg-md-red/5 p-3">
          <TierBadge tier={report.projection} />
          <span className="text-[12px] font-semibold text-ink">{report.role}</span>
          <span className="mx-1 text-hairline-heavy">·</span>
          <span className="text-[13px] text-ink-sub">{report.bottomLine}</span>
        </div>

        {report.comparablePlayers.length > 0 && (
          <div className="text-[12px] text-ink-muted">
            <span className="font-semibold text-ink-sub">Plays like: </span>
            {report.comparablePlayers.join(" · ")}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline pt-3">
          <span className="text-[10px] uppercase tracking-wider text-ink-muted">Sources</span>
          {report.sourceRefs.map((r) => (
            <span key={r.label} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
              {r.label}: {r.value}
            </span>
          ))}
          <span className="ml-auto font-mono text-[10px] text-ink-muted">model: {model}</span>
        </div>
      </div>
    </Card>
  );
}
