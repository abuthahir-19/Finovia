import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  hint?: string;
}

/** Friendly empty placeholder: a soft icon badge with a title and optional hint. */
export function EmptyState({ icon: Icon, title, hint }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200/70">
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium text-body">{title}</p>
      {hint && <p className="max-w-xs text-xs text-muted">{hint}</p>}
    </div>
  );
}
