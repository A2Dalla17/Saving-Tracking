"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/calculations";
import { t } from "@/lib/somali";
import type { ChartDataPoint } from "@/types";

interface SavingsChartProps {
  data: ChartDataPoint[];
}

export function SavingsChart({ data }: SavingsChartProps) {
  return (
    <Card className="animate-fade-in-up">
      <CardHeader>
        <CardTitle>{t.dashboard.savingsGrowth}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] sm:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#f7f2ea",
                  border: "1px solid #e0d6c8",
                  borderRadius: "12px",
                  color: "#1e293b",
                  fontFamily: "monospace",
                }}
                formatter={(value) => [formatCurrency(Number(value)), "Kaydka"]}
              />
              <Area
                type="monotone"
                dataKey="savings"
                stroke="#2563eb"
                strokeWidth={3}
                fill="url(#savingsGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
