import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Accent = "brand" | "sky" | "emerald" | "violet" | "amber";

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent?: Accent;
  children?: ReactNode;
}

const accents: Record<Accent, { badge: string; icon: string }> = {
  brand:   { badge: "from-brand-100   to-brand-50   ring-brand-200/60",   icon: "text-brand-600"   },
  sky:     { badge: "from-sky-100     to-sky-50     ring-sky-200/60",     icon: "text-sky-600"     },
  emerald: { badge: "from-emerald-100 to-emerald-50 ring-emerald-200/60", icon: "text-emerald-700" },
  violet:  { badge: "from-violet-100  to-violet-50  ring-violet-200/60",  icon: "text-violet-600"  },
  amber:   { badge: "from-amber-100   to-amber-50   ring-amber-200/60",   icon: "text-amber-600"   },
};

export function PageHeader({ icon: Icon, title, subtitle, accent = "brand", children }: Props) {
  const a = accents[accent];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3.5">
        <span
          className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm ring-1 ring-inset ${a.badge}`}
        >
          <Icon className={`h-5 w-5 ${a.icon}`} strokeWidth={2} />
        </span>
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
