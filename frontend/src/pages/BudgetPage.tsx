import { useState } from "react";
import { ChevronLeft, ChevronRight, Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useCategories, useBudgetStatus, useSetBudget, useDeleteBudget } from "../lib/hooks";
import { usePrivacyMoney } from "../lib/privacy";
import { getCategoryIcon } from "../lib/icons";
import { monthBounds } from "../lib/format";
import type { BudgetStatus } from "../lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_CONFIG = {
  ok:      { label: "On track",    chip: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
  warning: { label: "Warning",     chip: "bg-amber-50 text-amber-700",     bar: "bg-amber-500"   },
  over:    { label: "Over budget", chip: "bg-rose-50 text-rose-700",       bar: "bg-rose-500"    },
} as const;

export function BudgetPage() {
  const now = new Date();
  const money = usePrivacyMoney();

  const [year, setYear]   = useState(() => now.getUTCFullYear());
  const [month, setMonth] = useState(() => now.getUTCMonth());
  const range = monthBounds(year, month);

  const { data: budgets, isLoading } = useBudgetStatus(range);
  const { data: categories }         = useCategories();
  const setB = useSetBudget();
  const delB = useDeleteBudget();

  const [editingId, setEditingId]     = useState<number | null>(null);
  const [editValue, setEditValue]     = useState("");
  const [addingId, setAddingId]       = useState<number | null>(null);
  const [addValue, setAddValue]       = useState("");
  const [confirmDel, setConfirmDel]   = useState<BudgetStatus | null>(null);

  function navigate(delta: number) {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
  }

  function startEdit(b: BudgetStatus) {
    setAddingId(null);
    setEditingId(b.categoryId);
    setEditValue(String(b.monthlyBudget));
  }

  function startAdd(catId: number) {
    setEditingId(null);
    setAddingId(catId);
    setAddValue("");
  }

  function cancelEdit() { setEditingId(null); setEditValue(""); }
  function cancelAdd()  { setAddingId(null);  setAddValue(""); }

  async function saveEdit(categoryId: number) {
    const amount = parseFloat(editValue);
    if (!amount || amount <= 0) return;
    await setB.mutateAsync({ categoryId, monthlyBudget: amount });
    cancelEdit();
  }

  async function saveAdd(categoryId: number) {
    const amount = parseFloat(addValue);
    if (!amount || amount <= 0) return;
    await setB.mutateAsync({ categoryId, monthlyBudget: amount });
    cancelAdd();
  }

  const budgetList  = budgets ?? [];
  const budgetedIds = new Set(budgetList.map((b) => b.categoryId));
  const unbudgeted  = (categories ?? []).filter(
    (c) => c.kind === "EXPENSE" && !budgetedIds.has(c.id),
  );

  const totalBudget   = budgetList.reduce((s, b) => s + b.monthlyBudget, 0);
  const totalSpent    = budgetList.reduce((s, b) => s + b.actualSpent,   0);
  const totalPct      = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const overallStatus = totalSpent > totalBudget ? "over" : totalPct >= 80 ? "warning" : "ok";

  const hasBudgets    = budgetList.length > 0;
  const hasAnything   = hasBudgets || unbudgeted.length > 0;

  return (
    <div className="page space-y-6">
      <PageHeader
        icon={Landmark}
        accent="amber"
        title="Budgets"
        subtitle="Monthly spending limits per category"
      />

      {/* Month navigation */}
      <div className="flex items-center">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-white px-1 py-1 shadow-soft">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-slate-50 hover:text-ink"
            onClick={() => navigate(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[10rem] text-center text-sm font-semibold text-ink">
            {MONTHS[month]} {year}
          </span>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-slate-50 hover:text-ink"
            onClick={() => navigate(1)}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Overall summary */}
      {hasBudgets && (
        <div className="card">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Total budgeted
              </p>
              <p className="num mt-1 text-2xl font-bold tracking-tight text-ink">
                {money(totalBudget)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">Spent</p>
              <p
                className={`num text-lg font-semibold ${
                  overallStatus === "over"
                    ? "text-expense"
                    : overallStatus === "warning"
                      ? "text-amber-600"
                      : "text-income"
                }`}
              >
                {money(totalSpent)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-muted">
              <span>{totalPct.toFixed(0)}% used</span>
              <span className="num">{money(Math.max(totalBudget - totalSpent, 0))} remaining</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${STATUS_CONFIG[overallStatus].bar}`}
                style={{ width: `${totalPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="card h-48 animate-pulse bg-slate-50" />
      ) : !hasAnything ? (
        <EmptyState
          icon={Landmark}
          title="No expense categories yet"
          hint="Add transactions with categories first, then set budgets here."
        />
      ) : (
        <>
          {/* Budgeted categories */}
          {hasBudgets && (
            <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
              <div className="border-b border-line bg-slate-50/80 px-5 py-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                  Budgeted categories
                </h2>
              </div>
              <ul className="divide-y divide-line">
                {budgetList.map((b) => {
                  const Icon = getCategoryIcon(b.categoryName);
                  const sc   = STATUS_CONFIG[b.status];
                  const barW = Math.min(b.usedPct, 100);
                  const isEditing = editingId === b.categoryId;

                  return (
                    <li key={b.categoryId} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        {/* Category icon */}
                        <span
                          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl ring-1 ring-inset ring-black/[0.06]"
                          style={{ backgroundColor: `${b.categoryColor}22` }}
                        >
                          <Icon
                            className="h-4 w-4"
                            style={{ color: b.categoryColor }}
                            strokeWidth={2}
                          />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-ink">
                                {b.categoryName}
                              </span>
                              <span className={`chip text-[10px] font-bold ${sc.chip}`}>
                                {sc.label}
                              </span>
                            </div>

                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  autoFocus
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  className="input w-28 py-1 text-sm"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit(b.categoryId);
                                    if (e.key === "Escape") cancelEdit();
                                  }}
                                />
                                <button
                                  className="btn-primary px-3 py-1 text-xs"
                                  onClick={() => saveEdit(b.categoryId)}
                                  disabled={setB.isPending}
                                >
                                  Save
                                </button>
                                <button
                                  className="btn-ghost px-2 py-1 text-xs"
                                  onClick={cancelEdit}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-0.5">
                                <button
                                  className="rounded-lg p-1.5 text-muted transition hover:bg-brand-50 hover:text-brand-600"
                                  onClick={() => startEdit(b)}
                                  title="Edit budget"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  className="rounded-lg p-1.5 text-muted transition hover:bg-rose-50 hover:text-expense"
                                  onClick={() => setConfirmDel(b)}
                                  title="Remove budget"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Progress bar */}
                          <div className="mt-2">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${sc.bar}`}
                                style={{ width: `${barW}%` }}
                              />
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
                              <span className="num">{money(b.actualSpent)} spent</span>
                              <span className="num">
                                {b.usedPct.toFixed(0)}% of {money(b.monthlyBudget)}
                                {b.status === "over"
                                  ? ` — ${money(Math.abs(b.remaining))} over`
                                  : ` — ${money(b.remaining)} left`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Unbudgeted expense categories */}
          {unbudgeted.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
              <div className="border-b border-line bg-slate-50/80 px-5 py-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                  {hasBudgets ? "Set budgets for more categories" : "Expense categories — no budgets set yet"}
                </h2>
              </div>
              <ul className="divide-y divide-line">
                {unbudgeted.map((cat) => {
                  const Icon  = getCategoryIcon(cat.name);
                  const color = cat.color ?? "#94a3b8";
                  const isAdding = addingId === cat.id;

                  return (
                    <li
                      key={cat.id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg ring-1 ring-inset ring-black/[0.05]"
                          style={{ backgroundColor: `${color}22` }}
                        >
                          <Icon
                            className="h-3.5 w-3.5"
                            style={{ color }}
                            strokeWidth={2}
                          />
                        </span>
                        <span className="text-sm text-body">{cat.name}</span>
                      </span>

                      {isAdding ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="Monthly limit"
                            className="input w-32 py-1 text-sm"
                            value={addValue}
                            onChange={(e) => setAddValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveAdd(cat.id);
                              if (e.key === "Escape") cancelAdd();
                            }}
                          />
                          <button
                            className="btn-primary px-3 py-1 text-xs"
                            onClick={() => saveAdd(cat.id)}
                            disabled={setB.isPending}
                          >
                            Save
                          </button>
                          <button
                            className="btn-ghost px-2 py-1 text-xs"
                            onClick={cancelAdd}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          className="flex items-center gap-1.5 rounded-xl border border-dashed border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                          onClick={() => startAdd(cat.id)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Set budget
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <ConfirmDialog
          title="Remove budget?"
          message={`This removes the monthly limit for "${confirmDel.categoryName}". Your transactions won't be affected.`}
          confirmLabel="Remove"
          danger
          busy={delB.isPending}
          onConfirm={() => {
            delB.mutate(confirmDel.categoryId);
            setConfirmDel(null);
          }}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}
