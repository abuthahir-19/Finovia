import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  hint?: string;
}

export function EmptyState({ icon: Icon, title, hint }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-400 shadow-inner ring-1 ring-inset ring-slate-200/80">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <div>
        <p className="text-sm font-semibold text-body">{title}</p>
        {hint && <p className="mt-1 max-w-xs text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}
