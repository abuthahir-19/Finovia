import type { LucideIcon } from "lucide-react";

type Accent = "brand" | "income" | "expense" | "teal";

interface Props {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: Accent;
  hint?: string;
}

const accents: Record<
  Accent,
  { bar: string; chipFrom: string; chipTo: string; icon: string; glow: string }
> = {
  brand:   { bar: "bg-brand-500",   chipFrom: "from-brand-100",   chipTo: "to-brand-50",   icon: "text-brand-600",   glow: "from-brand-50/60"   },
  income:  { bar: "bg-emerald-500", chipFrom: "from-emerald-100", chipTo: "to-emerald-50", icon: "text-emerald-600", glow: "from-emerald-50/60" },
  expense: { bar: "bg-rose-500",    chipFrom: "from-rose-100",    chipTo: "to-rose-50",    icon: "text-rose-600",    glow: "from-rose-50/60"   },
  teal:    { bar: "bg-teal-500",    chipFrom: "from-teal-100",    chipTo: "to-teal-50",    icon: "text-teal-600",    glow: "from-teal-50/60"   },
};

export function KpiCard({ label, value, icon: Icon, accent = "brand", hint }: Props) {
  const a = accents[accent];
  return (
    <div
      className={`card lift relative overflow-hidden flex items-start justify-between gap-3 bg-gradient-to-br ${a.glow} to-white`}
    >
      {/* Coloured left accent bar */}
      <div className={`absolute inset-y-0 left-0 w-[3px] rounded-l-xl ${a.bar}`} />

      <div className="min-w-0 pl-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</p>
        <p className="num mt-2 truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {value}
        </p>
        {hint && <p className="mt-1.5 truncate text-xs text-muted">{hint}</p>}
      </div>

      {/* Gradient icon chip */}
      <span
        className={`flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-inset ring-black/[0.06] ${a.chipFrom} ${a.chipTo}`}
      >
        <Icon className={`h-5 w-5 ${a.icon}`} strokeWidth={2} />
      </span>
    </div>
  );
}
