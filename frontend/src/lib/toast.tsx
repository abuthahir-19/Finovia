import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";
export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

// Module-level store so non-component code (e.g. data hooks) can raise toasts.
let counter = 0;
let toasts: Toast[] = [];
const listeners = new Set<(t: Toast[]) => void>();

function emit() {
  listeners.forEach((l) => l(toasts));
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(type: ToastType, message: string) {
  const id = ++counter;
  toasts = [...toasts, { id, type, message }];
  emit();
  setTimeout(() => dismiss(id), 4000);
}

export const notify = {
  success: (m: string) => push("success", m),
  error: (m: string) => push("error", m),
  info: (m: string) => push("info", m),
};

const config: Record<ToastType, { Icon: typeof Info; ring: string; icon: string }> = {
  success: { Icon: CheckCircle2, ring: "border-emerald-200", icon: "text-emerald-600" },
  error: { Icon: AlertTriangle, ring: "border-rose-200", icon: "text-rose-600" },
  info: { Icon: Info, ring: "border-sky-200", icon: "text-sky-600" },
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>(toasts);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {items.map((t) => {
        const c = config[t.type];
        return (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto flex items-start gap-3 rounded-xl border ${c.ring} bg-white p-3 shadow-pop`}
          >
            <c.Icon className={`mt-0.5 h-5 w-5 flex-none ${c.icon}`} />
            <p className="flex-1 text-sm text-ink">{t.message}</p>
            <button
              className="text-muted transition hover:text-ink"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
