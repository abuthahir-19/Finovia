import { useMemo, useState } from "react";
import { Pencil, Receipt, Search, Trash2 } from "lucide-react";
import { ImportStatement } from "../components/ImportStatement";
import { TransactionForm } from "../components/TransactionForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageHeader } from "../components/PageHeader";
import { useCategories, useDeleteTransaction, useTransactions } from "../lib/hooks";
import { useMoney } from "../lib/money";
import { getCategoryIcon } from "../lib/icons";
import type { Category, Transaction, TransactionType } from "../lib/types";

type Filter = "ALL" | TransactionType;

export function TransactionsPage() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: categories } = useCategories();
  const del = useDeleteTransaction();
  const money = useMoney();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirm, setConfirm] = useState<Transaction | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  const findCategory = (id: number | null): Category | undefined =>
    categories?.find((c) => c.id === id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (transactions ?? []).filter((t) => {
      if (filter !== "ALL" && t.type !== filter) return false;
      if (!q) return true;
      const cat = findCategory(t.categoryId)?.name ?? "";
      return (
        (t.description ?? "").toLowerCase().includes(q) || cat.toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, categories, query, filter]);

  const tabs: { value: Filter; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "INCOME", label: "Income" },
    { value: "EXPENSE", label: "Expense" },
  ];

  return (
    <div className="page grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <PageHeader icon={Receipt} title="Transactions" subtitle="All your income and expenses" />

        <ImportStatement />

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  filter === tab.value ? "bg-white text-ink shadow-sm" : "text-muted hover:text-body"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="input pl-9"
              placeholder="Search description or category"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">
              {transactions && transactions.length > 0
                ? "No transactions match your filters."
                : "No transactions yet — add your first one below."}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="hidden w-full text-sm md:table">
                <thead className="border-b border-line bg-slate-50/80 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const cat = findCategory(t.categoryId);
                    const Icon = getCategoryIcon(cat?.name, t.type);
                    const color = cat?.color ?? "#94a3b8";
                    return (
                      <tr key={t.id} className="border-b border-line last:border-0 hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{t.occurredOn}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded-lg"
                              style={{ backgroundColor: `${color}1a` }}
                            >
                              <Icon className="h-4 w-4" style={{ color }} />
                            </span>
                            <span className="text-ink">{cat?.name ?? "Uncategorized"}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-body">{t.description ?? "—"}</td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                            t.type === "INCOME" ? "text-income" : "text-expense"
                          }`}
                        >
                          {t.type === "INCOME" ? "+" : "−"}
                          {money(t.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <button
                            className="mr-1 rounded-lg p-1.5 text-muted transition hover:bg-brand-50 hover:text-brand-600"
                            onClick={() => setEditing(t)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg p-1.5 text-muted transition hover:bg-rose-50 hover:text-expense disabled:opacity-50"
                            disabled={del.isPending}
                            onClick={() => setConfirm(t)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile card list */}
              <ul className="divide-y divide-line md:hidden">
                {filtered.map((t) => {
                  const cat = findCategory(t.categoryId);
                  const Icon = getCategoryIcon(cat?.name, t.type);
                  const color = cat?.color ?? "#94a3b8";
                  return (
                    <li key={t.id} className="flex items-center gap-3 p-3">
                      <span
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${color}1a` }}
                      >
                        <Icon className="h-4 w-4" style={{ color }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {t.description || cat?.name || "Uncategorized"}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {cat?.name ?? "Uncategorized"} · {t.occurredOn}
                        </p>
                      </div>
                      <div className="flex flex-none flex-col items-end gap-1">
                        <span
                          className={`text-sm font-semibold ${
                            t.type === "INCOME" ? "text-income" : "text-expense"
                          }`}
                        >
                          {t.type === "INCOME" ? "+" : "−"}
                          {money(t.amount)}
                        </span>
                        <span className="flex gap-1">
                          <button
                            className="rounded-lg p-1.5 text-muted transition hover:bg-brand-50 hover:text-brand-600"
                            onClick={() => setEditing(t)}
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg p-1.5 text-muted transition hover:bg-rose-50 hover:text-expense disabled:opacity-50"
                            disabled={del.isPending}
                            onClick={() => setConfirm(t)}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {!isLoading && transactions && transactions.length > 0 && (
          <p className="text-xs text-muted">
            Showing {filtered.length} of {transactions.length} transactions
          </p>
        )}
      </div>

      <aside className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">
          {editing ? "Edit transaction" : "Add transaction"}
        </h2>
        <TransactionForm
          key={editing?.id ?? "new"}
          existing={editing ?? undefined}
          onDone={() => setEditing(null)}
        />
      </aside>

      {confirm && (
        <ConfirmDialog
          title="Delete transaction?"
          message={`This will permanently remove "${confirm.description || "this transaction"}" (${money(
            confirm.amount,
          )}).`}
          confirmLabel="Delete"
          danger
          busy={del.isPending}
          onConfirm={() => {
            del.mutate(confirm.id);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
