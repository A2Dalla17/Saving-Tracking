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
        <CardTitle className="text-brand">{t.dashboard.savingsGrowth}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#690957" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#690957" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8D8ED" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#6B5B6E" }}
                axisLine={{ stroke: "#E8D8ED" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6B5B6E" }}
                axisLine={{ stroke: "#E8D8ED" }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#690957",
                  border: "none",
                  borderRadius: "12px",
                  color: "#fff",
                  fontFamily: "monospace",
                }}
                formatter={(value) => [formatCurrency(Number(value)), "Kaydka"]}
              />
              <Area
                type="monotone"
                dataKey="savings"
                stroke="#690957"
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
