import { useState } from "react";
import { Pencil, PiggyBank, Plus, Target, Trash2 } from "lucide-react";
import { useDeleteGoal, useGoals, useSaveGoal } from "../lib/hooks";
import { useMoney } from "../lib/money";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageHeader } from "../components/PageHeader";
import { ProgressRing } from "../components/ProgressRing";
import type { SavingsGoal } from "../lib/types";

export function GoalsPage() {
  const { data: goals, isLoading } = useGoals();
  const del = useDeleteGoal();
  const money = useMoney();
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<SavingsGoal | null>(null);

  return (
    <div className="page space-y-6">
      <PageHeader icon={PiggyBank} accent="emerald" title="Savings Goals" subtitle="Track progress toward what matters">
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New goal
        </button>
      </PageHeader>

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(goals ?? []).map((g) => {
            const achieved = g.status === "ACHIEVED";
            return (
              <div key={g.id} className="card lift space-y-4">
                <div className="flex items-center gap-4">
                  <ProgressRing
                    value={g.progressPct}
                    color={achieved ? "#059669" : "#4f46e5"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-medium leading-tight">{g.name}</h3>
                      <span
                        className={`chip flex-none ${
                          achieved ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-body"
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink">
                      {money(g.currentAmount)}
                      <span className="text-muted"> of {money(g.targetAmount)}</span>
                    </p>
                    {g.targetDate && (
                      <p className="mt-0.5 text-xs text-muted">Target by {g.targetDate}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="btn-ghost flex-1" onClick={() => setEditing(g)}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    className="btn-ghost px-3 text-expense hover:bg-rose-50"
                    disabled={del.isPending}
                    onClick={() => setConfirm(g)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {goals?.length === 0 && (
            <div className="card col-span-full flex flex-col items-center gap-2 py-10 text-center">
              <Target className="h-8 w-8 text-muted" />
              <p className="text-sm text-muted">No goals yet. Create one to start saving.</p>
            </div>
          )}
        </div>
      )}

      {(creating || editing) && (
        <GoalDialog
          existing={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete goal?"
          message={`This will permanently remove "${confirm.name}".`}
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

function GoalDialog({ existing, onClose }: { existing?: SavingsGoal; onClose: () => void }) {
  const save = useSaveGoal();
  const [name, setName] = useState(existing?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(existing ? String(existing.targetAmount) : "");
  const [currentAmount, setCurrentAmount] = useState(existing ? String(existing.currentAmount) : "0");
  const [targetDate, setTargetDate] = useState(existing?.targetDate ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await save.mutateAsync({
      id: existing?.id,
      body: {
        name,
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount),
        targetDate: targetDate || null,
      },
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 shadow-pop">
        <h2 className="text-lg font-semibold">{existing ? "Edit goal" : "New goal"}</h2>
        <div>
          <label className="label">Name</label>
          <input
            className="input"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Emergency fund"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Target amount</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Saved so far</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Target date (optional)</label>
          <input
            className="input"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
        {save.isError && <p className="text-sm text-expense">{(save.error as Error).message}</p>}
        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save goal"}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
