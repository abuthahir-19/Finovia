import { CheckCircle2, Info, AlertTriangle, XCircle, Lightbulb, type LucideIcon } from "lucide-react";
import type { Insight } from "../lib/types";

const config: Record<Insight["severity"], { wrap: string; icon: string; Icon: LucideIcon }> = {
  success: { wrap: "border-emerald-100 bg-emerald-50/60", icon: "text-emerald-600", Icon: CheckCircle2 },
  info: { wrap: "border-sky-100 bg-sky-50/60", icon: "text-sky-600", Icon: Info },
  warning: { wrap: "border-amber-100 bg-amber-50/60", icon: "text-amber-600", Icon: AlertTriangle },
  danger: { wrap: "border-rose-100 bg-rose-50/60", icon: "text-rose-600", Icon: XCircle },
};

export function InsightList({ insights }: { insights: Insight[] }) {
  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-ink">Insights</h3>
      </div>
      <ul className="space-y-2.5">
        {insights.map((insight, idx) => {
          const c = config[insight.severity];
          return (
            <li key={idx} className={`flex gap-3 rounded-xl border p-3 ${c.wrap}`}>
              <c.Icon className={`mt-0.5 h-5 w-5 flex-none ${c.icon}`} />
              <div className="text-sm">
                <p className="font-medium text-ink">{insight.title}</p>
                <p className="text-body">{insight.message}</p>
              </div>
            </li>
          );
        })}
        {insights.length === 0 && (
          <li className="rounded-xl border border-line p-3 text-sm text-muted">
            No insights yet — add transactions to see personalized tips.
          </li>
        )}
      </ul>
    </div>
  );
}
