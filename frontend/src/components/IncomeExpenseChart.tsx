import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { useIncomeVsExpense } from "../lib/hooks";
import { useMoney } from "../lib/money";
import { tooltipStyle } from "./SpendByCategoryChart";

export function IncomeExpenseChart({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useIncomeVsExpense({ from, to });
  const money = useMoney();

  if (isLoading) {
    return <div className="card h-80 animate-pulse" aria-busy="true" />;
  }

  const points = data ?? [];

  return (
    <div className="card min-w-0">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-ink">Income vs. Expense</h3>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={points} barGap={6}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="period" tick={axisTick} tickLine={false} axisLine={{ stroke: "#e7ebf3" }} />
          <YAxis
            tick={axisTick}
            width={72}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => money(v)}
          />
          <Tooltip
            formatter={(v: number) => money(v)}
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(99,102,241,0.06)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#475569" }} iconType="circle" />
          <Bar dataKey="income" name="Income" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={36} />
          <Bar dataKey="expense" name="Expense" fill="#e11d48" radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const axisTick = { fill: "#94a3b8", fontSize: 11 } as const;
