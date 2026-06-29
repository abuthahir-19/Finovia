import { CheckCircle2, Info, AlertTriangle, XCircle, Lightbulb, type LucideIcon } from "lucide-react";
import type { Insight } from "../lib/types";

const config: Record<
  Insight["severity"],
  { wrap: string; iconBg: string; icon: string; Icon: LucideIcon }
> = {
  success: { wrap: "border-emerald-100 bg-emerald-50/70", iconBg: "bg-emerald-100", icon: "text-emerald-600", Icon: CheckCircle2 },
  info:    { wrap: "border-sky-100     bg-sky-50/70",     iconBg: "bg-sky-100",     icon: "text-sky-600",    Icon: Info          },
  warning: { wrap: "border-amber-100   bg-amber-50/70",   iconBg: "bg-amber-100",   icon: "text-amber-600",  Icon: AlertTriangle },
  danger:  { wrap: "border-rose-100    bg-rose-50/70",    iconBg: "bg-rose-100",    icon: "text-rose-600",   Icon: XCircle       },
};

export function InsightList({ insights }: { insights: Insight[] }) {
  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-amber-50 ring-1 ring-inset ring-amber-200/60">
          <Lightbulb className="h-4 w-4 text-amber-600" strokeWidth={2} />
        </span>
        <h3 className="text-sm font-semibold text-ink">Insights</h3>
      </div>
      <ul className="space-y-2.5">
        {insights.map((insight, idx) => {
          const c = config[insight.severity];
          return (
            <li key={idx} className={`flex gap-3 rounded-xl border p-3 ${c.wrap}`}>
              <span className={`mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg ${c.iconBg}`}>
                <c.Icon className={`h-4 w-4 ${c.icon}`} strokeWidth={2} />
              </span>
              <div className="text-sm">
                <p className="font-semibold text-ink">{insight.title}</p>
                <p className="mt-0.5 text-body">{insight.message}</p>
              </div>
            </li>
          );
        })}
        {insights.length === 0 && (
          <li className="rounded-xl border border-line bg-slate-50/60 p-3.5 text-sm text-muted">
            No insights yet — add transactions to see personalised tips.
          </li>
        )}
      </ul>
    </div>
  );
}
