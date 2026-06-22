import type { LucideIcon } from "lucide-react";

type Accent = "brand" | "income" | "expense" | "teal";

interface Props {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: Accent;
  hint?: string;
}

const accents: Record<Accent, { grad: string; chip: string; icon: string }> = {
  brand: { grad: "from-brand-50", chip: "bg-brand-100", icon: "text-brand-600" },
  income: { grad: "from-emerald-50", chip: "bg-emerald-100", icon: "text-emerald-600" },
  expense: { grad: "from-rose-50", chip: "bg-rose-100", icon: "text-rose-600" },
  teal: { grad: "from-teal-50", chip: "bg-teal-100", icon: "text-teal-600" },
};

export function KpiCard({ label, value, icon: Icon, accent = "brand", hint }: Props) {
  const a = accents[accent];
  return (
    <div
      className={`card lift flex items-start justify-between gap-3 bg-gradient-to-br ${a.grad} to-white`}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-2 truncate text-2xl font-semibold text-ink">{value}</p>
        {hint && <p className="mt-1 truncate text-xs text-muted">{hint}</p>}
      </div>
      <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${a.chip}`}>
        <Icon className={`h-5 w-5 ${a.icon}`} />
      </span>
    </div>
  );
}
