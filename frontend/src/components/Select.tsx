import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SelectProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Accessible custom dropdown that matches the app theme (native <select> can't be
 * fully styled). Supports keyboard navigation, outside-click / Escape to close,
 * a check mark on the selected option, and optional per-option icons.
 */
export function Select<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className = "",
  ariaLabel,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // On open, highlight the current selection; keep the active option in view.
  useEffect(() => {
    if (open) setActive(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (open) {
      (listRef.current?.children[active] as HTMLElement | undefined)?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [open, active]);

  function commit(index: number) {
    const opt = options[index];
    if (opt) {
      onChange(opt.value);
      setOpen(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(a + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  }

  const SelectedIcon = selected?.icon;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition hover:bg-slate-50 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/20"
      >
        <span className="flex min-w-0 items-center gap-2">
          {SelectedIcon && <SelectedIcon className="h-4 w-4 flex-none text-brand-600" />}
          <span className={`truncate ${selected ? "" : "text-muted"}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-none text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-line bg-white p-1 shadow-pop"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === active;
            const Icon = opt.icon;
            return (
              <li
                key={String(opt.value)}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(i)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-body"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {Icon && (
                    <Icon className={`h-4 w-4 flex-none ${isActive ? "text-brand-600" : "text-muted"}`} />
                  )}
                  <span className={`truncate ${isSelected ? "font-medium text-ink" : ""}`}>
                    {opt.label}
                  </span>
                </span>
                {isSelected && <Check className="h-4 w-4 flex-none text-brand-600" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
