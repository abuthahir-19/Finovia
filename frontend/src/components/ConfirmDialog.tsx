import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Lightweight confirmation modal for destructive actions. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  // Close on Escape and lock background scroll while the dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [busy, onCancel]);

  // Portal to <body> so an ancestor's CSS transform (e.g. the .page entrance
  // animation) can't capture our position:fixed and mis-center the dialog.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="card w-full max-w-sm space-y-4 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${
              danger ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-600"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-sm text-body">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className={danger ? "btn bg-expense text-white hover:opacity-90" : "btn-primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
