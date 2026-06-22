import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { useSpendByCategory } from "../lib/hooks";
import { useMoney } from "../lib/money";

/**
 * Primary graphing component: a donut breakdown of expenses by category.
 * Data is fetched via TanStack Query and rendered with Recharts.
 */
export function SpendByCategoryChart({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useSpendByCategory({ from, to });
  const money = useMoney();

  if (isLoading) {
    return <div className="card h-80 animate-pulse" aria-busy="true" />;
  }

  const slices = data ?? [];

  return (
    <div className="card min-w-0">
      <div className="mb-3 flex items-center gap-2">
        <PieIcon className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-ink">Spending by Category</h3>
      </div>
      {slices.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="total"
              nameKey="category"
              innerRadius={64}
              outerRadius={104}
              paddingAngle={3}
              stroke="#fff"
              strokeWidth={2}
            >
              {slices.map((s) => (
                <Cell key={`${s.categoryId}-${s.category}`} fill={s.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => money(value)} contentStyle={tooltipStyle} />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 12, color: "#475569", paddingTop: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #e7ebf3",
  borderRadius: 12,
  boxShadow: "0 12px 40px rgba(16,24,40,0.12)",
  color: "#0f172a",
  fontSize: 12,
} as const;

function EmptyState() {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-muted">
      No expenses in this period yet.
    </div>
  );
}
