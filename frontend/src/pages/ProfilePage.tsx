import { useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  CreditCard,
  LogOut,
  Target,
  UserCog,
  Wallet,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useAccountStats, useProfile, useUpdateProfile } from "../lib/hooks";
import { useMoney } from "../lib/money";
import { Select } from "../components/Select";
import { PageHeader } from "../components/PageHeader";
import type { Profile } from "../lib/types";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "AUD", "CAD", "SGD", "JPY"];

export function ProfilePage() {
  const { data: profile, isLoading } = useProfile();

  return (
    <div className="page space-y-6">
      <PageHeader icon={UserCog} accent="violet" title="Account" subtitle="Your profile and lifetime activity" />

      {isLoading || !profile ? (
        <div className="card h-48 animate-pulse" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <ProfileCard profile={profile} />
          <StatsPanel />
        </div>
      )}
    </div>
  );
}

function ProfileCard({ profile }: { profile: Profile }) {
  const { user, logout } = useAuth();
  const update = useUpdateProfile();

  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [currency, setCurrency] = useState(profile.baseCurrency ?? "INR");
  const [saved, setSaved] = useState(false);

  const dirty = displayName !== (profile.displayName ?? "") || currency !== profile.baseCurrency;
  const initial = (profile.displayName || profile.email || "?").charAt(0).toUpperCase();
  const created = profile.createdAt ? new Date(profile.createdAt) : null;
  const memberSince =
    created && !Number.isNaN(created.getTime())
      ? created.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
      : null;

  async function save() {
    await update.mutateAsync({ displayName, baseCurrency: currency });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-teal-400 text-2xl font-semibold text-white shadow-sm">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{profile.displayName || "Welcome"}</p>
          <p className="truncate text-sm text-muted">{profile.email || user?.email}</p>
          {memberSince && <p className="mt-1 text-xs text-muted">Member since {memberSince}</p>}
        </div>
      </div>

      <div className="space-y-3 border-t border-line pt-4">
        <div>
          <label className="label">Display name</label>
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={120}
          />
        </div>
        <div>
          <label className="label">Base currency</label>
          <Select
            ariaLabel="Base currency"
            value={currency}
            onChange={setCurrency}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          />
          <p className="mt-1 text-xs text-muted">Used to display all amounts across the app.</p>
        </div>

        {update.isError && (
          <p className="text-sm text-expense">{(update.error as Error).message}</p>
        )}

        <button className="btn-primary w-full" disabled={!dirty || update.isPending} onClick={save}>
          {update.isPending ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>

      <button className="btn-ghost w-full text-expense" onClick={() => logout()}>
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}

function StatsPanel() {
  const { data: stats, isLoading, isError, refetch } = useAccountStats();
  const money = useMoney();

  if (isLoading) {
    return <div className="card h-64 animate-pulse" />;
  }

  if (isError || !stats) {
    return (
      <div className="card flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted">
          Couldn’t load your statistics. If you just updated the app, restart the backend so the
          new <code className="rounded bg-slate-100 px-1">/api/me/stats</code> endpoint is available.
        </p>
        <button className="btn-ghost" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const cards = [
    {
      label: "Lifetime income",
      value: money(stats.totalIncome),
      icon: ArrowUpCircle,
      chip: "bg-emerald-50",
      color: "text-emerald-600",
    },
    {
      label: "Lifetime expenses",
      value: money(stats.totalExpense),
      icon: ArrowDownCircle,
      chip: "bg-rose-50",
      color: "text-rose-600",
    },
    {
      label: "Net balance",
      value: money(stats.net),
      icon: Wallet,
      chip: "bg-brand-50",
      color: "text-brand-600",
    },
    {
      label: "Transactions",
      value: String(stats.transactionCount),
      icon: CreditCard,
      chip: "bg-slate-100",
      color: "text-slate-600",
    },
    {
      label: "Active goals",
      value: String(stats.activeGoalCount),
      icon: Target,
      chip: "bg-sky-50",
      color: "text-sky-600",
    },
    {
      label: "Goals achieved",
      value: String(stats.achievedGoalCount),
      icon: CheckCircle2,
      chip: "bg-emerald-50",
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-ink">Lifetime activity</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card lift">
            <span
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ring-inset ring-black/5 ${c.chip}`}
            >
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </span>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{c.label}</p>
            <p className="num mt-1 truncate text-xl font-semibold text-ink">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
