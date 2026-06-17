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
                  <stop offset="5%" stopColor="#0f2744" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0f2744" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,48,65,0.08)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#0f2744" }}
                axisLine={{ stroke: "rgba(36,48,65,0.15)" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#0f2744" }}
                axisLine={{ stroke: "rgba(36,48,65,0.15)" }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid rgba(15,39,68,0.12)",
                  color: "#0f2744",
                  borderRadius: "12px",
                  fontFamily: "Roboto, Segoe UI, sans-serif",
                }}
                formatter={(value) => [formatCurrency(Number(value)), "Kaydka"]}
              />
              <Area
                type="monotone"
                dataKey="savings"
                stroke="#0f2744"
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
