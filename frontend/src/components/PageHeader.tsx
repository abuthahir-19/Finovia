import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Accent = "brand" | "sky" | "emerald" | "violet";

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent?: Accent;
  children?: ReactNode; // right-aligned actions
}

// Per-section gradient badge so each page reads with its own colour identity.
const accents: Record<Accent, string> = {
  brand: "from-brand-50 to-brand-100 text-brand-600 ring-brand-100",
  sky: "from-sky-50 to-sky-100 text-sky-600 ring-sky-100",
  emerald: "from-emerald-50 to-emerald-100 text-emerald-700 ring-emerald-100",
  violet: "from-violet-50 to-violet-100 text-violet-600 ring-violet-100",
};

/** Consistent page header: a colored icon badge, title + subtitle, and an optional action slot. */
export function PageHeader({ icon: Icon, title, subtitle, accent = "brand", children }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm ring-1 ring-inset ${accents[accent]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
