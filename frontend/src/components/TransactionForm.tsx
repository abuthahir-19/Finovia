import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Tag } from "lucide-react";
import { useCategories, useSaveTransaction } from "../lib/hooks";
import { isoDate } from "../lib/format";
import { getCategoryIcon } from "../lib/icons";
import { Select, type SelectOption } from "./Select";
import type { Transaction, TransactionType } from "../lib/types";

interface Props {
  existing?: Transaction;
  onDone?: () => void;
}

export function TransactionForm({ existing, onDone }: Props) {
  const { data: categories } = useCategories();
  const save = useSaveTransaction();

  const [type, setType] = useState<TransactionType>(existing?.type ?? "EXPENSE");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [categoryId, setCategoryId] = useState<string>(
    existing?.categoryId ? String(existing.categoryId) : "",
  );
  const [description, setDescription] = useState(existing?.description ?? "");
  const [occurredOn, setOccurredOn] = useState(existing?.occurredOn ?? isoDate(new Date()));

  const visibleCategories = (categories ?? []).filter((c) => c.kind === type);
  const categoryOptions: SelectOption<string>[] = [
    { value: "", label: "Uncategorized", icon: Tag },
    ...visibleCategories.map((c) => ({
      value: String(c.id),
      label: c.name,
      icon: getCategoryIcon(c.name, c.kind),
    })),
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await save.mutateAsync({
      id: existing?.id,
      body: {
        type,
        amount: Number(amount),
        categoryId: categoryId ? Number(categoryId) : null,
        description: description || undefined,
        occurredOn,
      },
    });
    if (!existing) {
      setAmount("");
      setDescription("");
    }
    onDone?.();
  }

  const tabs: { value: TransactionType; label: string; icon: typeof ArrowUpCircle }[] = [
    { value: "EXPENSE", label: "Expense", icon: ArrowDownCircle },
    { value: "INCOME", label: "Income", icon: ArrowUpCircle },
  ];

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => {
          const active = type === t.value;
          return (
            <button
              type="button"
              key={t.value}
              onClick={() => setType(t.value)}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active ? "bg-white text-ink shadow-sm" : "text-muted hover:text-body"
              }`}
            >
              <t.icon
                className={`h-4 w-4 ${
                  active ? (t.value === "INCOME" ? "text-income" : "text-expense") : ""
                }`}
              />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Amount</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            required
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Category</label>
        <Select
          ariaLabel="Category"
          value={categoryId}
          onChange={setCategoryId}
          options={categoryOptions}
        />
      </div>

      <div>
        <label className="label">Description</label>
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional note"
          maxLength={255}
        />
      </div>

      {save.isError && <p className="text-sm text-expense">{(save.error as Error).message}</p>}

      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={save.isPending}>
          {save.isPending ? "Saving…" : existing ? "Update" : "Add transaction"}
        </button>
        {onDone && (
          <button type="button" className="btn-ghost" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
