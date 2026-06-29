import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineIcon } from "lucide-react";
import { useSavingsTrend } from "../lib/hooks";
import { usePrivacyMoney } from "../lib/privacy";
import { tooltipStyle } from "./SpendByCategoryChart";

export function SavingsTrendChart({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useSavingsTrend({ from, to });
  const money = usePrivacyMoney();

  if (isLoading) {
    return <div className="card h-80 animate-pulse" aria-busy="true" />;
  }

  const points = data ?? [];

  return (
    <div className="card min-w-0">
      <div className="mb-3 flex items-center gap-2">
        <LineIcon className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-ink">Cumulative Savings Trend</h3>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={points}>
          <defs>
            <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="period" tick={axisTick} tickLine={false} axisLine={{ stroke: "#e7ebf3" }} />
          <YAxis
            tick={axisTick}
            width={72}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => money(v)}
          />
          <Tooltip formatter={(v: number) => money(v)} contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="cumulativeSavings"
            name="Savings"
            stroke="#4f46e5"
            strokeWidth={2.5}
            fill="url(#savingsFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const axisTick = { fill: "#94a3b8", fontSize: 11 } as const;
