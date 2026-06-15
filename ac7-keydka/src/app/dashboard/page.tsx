"use client";

import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { SavingsChart } from "@/components/dashboard/savings-chart";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/lib/hooks/use-data";
import { calculateGroupStats, buildSavingsChartData } from "@/lib/calculations";
import { getPayingMembers, filterPayingPayments } from "@/lib/member-status";
import { t } from "@/lib/somali";

export default function DashboardPage() {
  const { members, payments, settings, loading } = useData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    );
  }

  const payingMembers = getPayingMembers(members);
  const payingPayments = filterPayingPayments(members, payments);
  const groupStats = calculateGroupStats(payingMembers, payingPayments, settings);
  const chartData = buildSavingsChartData(payingPayments);
  const recentPayments = payingPayments.slice(0, 5);

  return (
    <div>
      <PageHeader title={t.dashboard.title} subtitle={t.dashboard.subtitle} />

      <div className="space-y-6">
        <StatsCards stats={groupStats} />

        <Card className="animate-fade-in-up border-brand/10">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">{t.dashboard.groupGoal}</span>
              <span className="font-mono-currency text-sm font-semibold text-brand">
                {groupStats.goalProgress.toFixed(0)}%
              </span>
            </div>
            <Progress value={groupStats.goalProgress} className="h-3" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <CurrencyDisplay amount={groupStats.totalSavings} size="sm" />
              <span>/ <CurrencyDisplay amount={groupStats.groupGoal} size="sm" /></span>
            </div>
          </CardContent>
        </Card>

        <SavingsChart data={chartData} />

        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-brand">{t.dashboard.recentPayments}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t.dashboard.noPayments}</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{payment.memberName}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.month} {payment.year} ·{" "}
                        {format(new Date(payment.paidAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <CurrencyDisplay amount={payment.amount} size="sm" className="text-brand" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
