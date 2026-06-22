import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarRange,
  Clock,
  Hash,
  Layers,
  LayoutDashboard,
  PiggyBank,
  Percent,
  TrendingDown,
  Trophy,
  Wallet,
} from "lucide-react";
import { KpiCard } from "../components/KpiCard";
import { InsightList } from "../components/InsightList";
import { SpendByCategoryChart } from "../components/SpendByCategoryChart";
import { IncomeExpenseChart } from "../components/IncomeExpenseChart";
import { SavingsTrendChart } from "../components/SavingsTrendChart";
import { Select } from "../components/Select";
import {
  useCategories,
  useLastSalary,
  useProfile,
  useSummary,
  useTransactions,
} from "../lib/hooks";
import { useMoney } from "../lib/money";
import { getCategoryIcon } from "../lib/icons";
import { formatPct, formatRangeLabel, monthBounds, todayIso, trailingMonths } from "../lib/format";

type RangeMode = "salary" | "month" | "3m" | "6m" | "12m" | "custom";

function daysBetween(from: string, to: string): number {
  const ms = new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function DashboardPage() {
  const now = new Date();
  const money = useMoney();
  const { data: lastSalary } = useLastSalary();
  const { data: profile } = useProfile();

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = profile?.displayName?.trim() || profile?.email?.split("@")[0] || "";

  const [mode, setMode] = useState<RangeMode>("salary");
  const [customFrom, setCustomFrom] = useState(monthBounds(now.getUTCFullYear(), now.getUTCMonth()).from);
  const [customTo, setCustomTo] = useState(todayIso());

  const range = useMemo(() => {
    const thisMonth = monthBounds(now.getUTCFullYear(), now.getUTCMonth());
    switch (mode) {
      case "salary":
        return lastSalary ? { from: lastSalary.date, to: todayIso() } : thisMonth;
      case "3m":
        return trailingMonths(now.getUTCFullYear(), now.getUTCMonth(), 3);
      case "6m":
        return trailingMonths(now.getUTCFullYear(), now.getUTCMonth(), 6);
      case "12m":
        return trailingMonths(now.getUTCFullYear(), now.getUTCMonth(), 12);
      case "custom":
        return customFrom && customTo ? { from: customFrom, to: customTo } : thisMonth;
      case "month":
      default:
        return thisMonth;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lastSalary, customFrom, customTo]);

  const { data: summary, isLoading } = useSummary(range);
  const { data: periodTx } = useTransactions(range);
  const { data: categories } = useCategories();

  const salaryMode = mode === "salary" && !!lastSalary;
  const expense = summary?.totalExpense ?? 0;
  const incomeValue = salaryMode ? (lastSalary?.amount ?? 0) : (summary?.totalIncome ?? 0);
  const netValue = salaryMode ? incomeValue - expense : (summary?.netSavings ?? 0);
  const rateValue = salaryMode
    ? incomeValue > 0
      ? (netValue / incomeValue) * 100
      : 0
    : (summary?.savingsRatePct ?? 0);

  // Secondary metrics derived from the period.
  const days = daysBetween(range.from, range.to);
  const txCount = periodTx?.length ?? 0;
  const avgPerDay = expense / days;
  const topCat = summary?.topExpenseCategories?.[0];
  const recent = (periodTx ?? []).slice(0, 6);
  const categoryName = (id: number | null) => categories?.find((c) => c.id === id)?.name ?? "Uncategorized";
  const maxCat = summary?.topExpenseCategories?.[0]?.total ?? 0;

  const caption =
    mode === "salary" && !lastSalary
      ? "No salary recorded yet — showing this month. Add a Salary income to track your pay period."
      : formatRangeLabel(range.from, range.to);

  return (
    <div className="page space-y-6">
      <div className="relative z-20 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-500 p-5 text-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-white/15">
              <LayoutDashboard className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-semibold leading-tight">
                {greeting}
                {name ? `, ${name}` : ""}
              </h1>
              <p className="text-sm text-white/80">{caption}</p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Select
            className="w-full sm:w-48"
            ariaLabel="Date range"
            value={mode}
            onChange={(v) => setMode(v as RangeMode)}
            options={[
              { value: "salary", label: "Since last salary", icon: Wallet },
              { value: "month", label: "This month" },
              { value: "3m", label: "Last 3 months" },
              { value: "6m", label: "Last 6 months" },
              { value: "12m", label: "Last 12 months" },
              { value: "custom", label: "Custom range" },
            ]}
          />
          {mode === "custom" && (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <input
                type="date"
                className="input flex-1 sm:w-auto sm:flex-none"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                aria-label="Start date"
              />
              <span className="text-muted">→</span>
              <input
                type="date"
                className="input flex-1 sm:w-auto sm:flex-none"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                aria-label="End date"
              />
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Primary KPIs */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={salaryMode ? "Salary" : "Income"}
          value={isLoading ? "—" : money(incomeValue)}
          icon={salaryMode ? Wallet : ArrowUpCircle}
          accent="income"
          hint={salaryMode && lastSalary ? `Received ${lastSalary.date}` : undefined}
        />
        <KpiCard
          label="Expenses"
          value={isLoading ? "—" : money(expense)}
          icon={ArrowDownCircle}
          accent="expense"
        />
        <KpiCard
          label={salaryMode ? "Left from salary" : "Net savings"}
          value={isLoading ? "—" : money(netValue)}
          icon={PiggyBank}
          accent="brand"
          hint={salaryMode ? "Salary − expenses" : undefined}
        />
        <KpiCard
          label="Savings rate"
          value={isLoading ? "—" : formatPct(rateValue)}
          icon={Percent}
          accent="teal"
          hint="Target: 20%+"
        />
      </section>

      {/* Secondary metrics strip */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat icon={CalendarRange} label="Days in period" value={String(days)} />
        <MiniStat icon={Hash} label="Transactions" value={String(txCount)} />
        <MiniStat icon={TrendingDown} label="Avg spend / day" value={money(avgPerDay)} />
        <MiniStat
          icon={Trophy}
          label="Top category"
          value={topCat ? topCat.category : "—"}
          sub={topCat ? money(topCat.total) : undefined}
        />
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <SpendByCategoryChart from={range.from} to={range.to} />
        <IncomeExpenseChart from={range.from} to={range.to} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <SavingsTrendChart from={range.from} to={range.to} />
        </div>
        <InsightList insights={summary?.insights ?? []} />
      </section>

      {/* Details: top categories + recent activity */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-ink">Top spending categories</h3>
          </div>
          {summary && summary.topExpenseCategories.length > 0 ? (
            <ul className="space-y-3">
              {summary.topExpenseCategories.map((c) => {
                const Icon = getCategoryIcon(c.category);
                const pct = expense > 0 ? (c.total / expense) * 100 : 0;
                const barPct = maxCat > 0 ? (c.total / maxCat) * 100 : 0;
                return (
                  <li key={`${c.categoryId}-${c.category}`}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${c.color}1a` }}
                        >
                          <Icon className="h-4 w-4" style={{ color: c.color }} />
                        </span>
                        <span className="text-ink">{c.category}</span>
                      </span>
                      <span className="text-body">
                        {money(c.total)} <span className="text-muted">· {pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${barPct}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted">No spending in this period.</p>
          )}
        </div>

        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-ink">Recent activity</h3>
          </div>
          {recent.length > 0 ? (
            <ul className="divide-y divide-line">
              {recent.map((t) => {
                const name = categoryName(t.categoryId);
                const Icon = getCategoryIcon(name, t.type);
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-slate-100">
                        <Icon className="h-4 w-4 text-slate-500" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-ink">
                          {t.description || name}
                        </span>
                        <span className="block text-xs text-muted">{t.occurredOn}</span>
                      </span>
                    </span>
                    <span
                      className={`flex-none text-sm font-medium ${
                        t.type === "INCOME" ? "text-income" : "text-expense"
                      }`}
                    >
                      {t.type === "INCOME" ? "+" : "−"}
                      {money(t.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted">No transactions in this period.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card lift flex items-center gap-3 py-4">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-slate-100">
        <Icon className="h-4 w-4 text-slate-500" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-base font-semibold text-ink">{value}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
}
