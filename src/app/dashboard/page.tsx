"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { rowToSavings } from "@/lib/supabase-mappers";
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
import type { Payment, Savings } from "@/types";

function savingsToPayment(item: Savings): Payment {
  return {
    id: item.id,
    memberId: item.memberId,
    memberName: item.memberName,
    amount: item.amount,
    month: item.month,
    year: item.year,
    paidAt: item.paidAt,
    note: item.note,
  };
}

export default function DashboardPage() {
  const { members, payments, settings, loading: dataLoading } = useData();
  const [savings, setSavings] = useState<Savings[]>([]);
  const [savingsLoading, setSavingsLoading] = useState(true);
  const [savingsError, setSavingsError] = useState<string | null>(null);
  const cloudMode = isSupabaseConfigured();

  const fetchSavings = useCallback(async () => {
    if (!cloudMode) {
      setSavings([]);
      setSavingsLoading(false);
      return;
    }

    setSavingsLoading(true);
    setSavingsError(null);

    const { data, error } = await supabase
      .from("savings")
      .select("*")
      .order("paid_at", { ascending: false });

    if (error) {
      console.error("SUPABASE savings error:", error);
      setSavingsError(error.message);
      setSavings([]);
    } else {
      console.log("SUPABASE savings data:", data);
      setSavings((data ?? []).map((row) => rowToSavings(row)));
    }

    setSavingsLoading(false);
  }, [cloudMode]);

  useEffect(() => {
    fetchSavings();

    if (!cloudMode) return;

    const client = getSupabase();
    if (!client) return;

    const channel: RealtimeChannel = client
      .channel("dashboard-savings")
      .on("postgres_changes", { event: "*", schema: "public", table: "savings" }, () => {
        fetchSavings();
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [cloudMode, fetchSavings]);

  const loading = dataLoading;

  const savingsPayments = useMemo(() => savings.map(savingsToPayment), [savings]);
  const displayPayments = cloudMode && savings.length > 0 ? savingsPayments : payments;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white/80">{t.common.loading}</p>
      </div>
    );
  }

  const payingMembers = getPayingMembers(members);
  const payingPayments = filterPayingPayments(members, displayPayments);
  const groupStats = calculateGroupStats(payingMembers, payingPayments, settings);
  const chartData = buildSavingsChartData(payingPayments);
  const recentPayments = payingPayments.slice(0, 5);

  return (
    <div>
      <PageHeader title={t.dashboard.title} subtitle={t.dashboard.subtitle} />

      <div className="space-y-6">
        {cloudMode && (
          <Card>
            <CardContent className="py-3 px-4 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-slate-600 font-medium">{t.settings.connected}</span>
              <span className="text-slate-500">
                {savingsLoading ? t.common.loading : `${savings.length} ${t.dashboard.savingsRecords}`}
              </span>
            </CardContent>
          </Card>
        )}

        {savingsError && (
          <Card className="border-destructive/40">
            <CardContent className="py-3 px-4 text-sm text-destructive">
              Supabase: {savingsError}
            </CardContent>
          </Card>
        )}

        <StatsCards stats={groupStats} />

        <Card className="animate-fade-in-up">
          <CardContent className="p-5 sm:p-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-600">{t.dashboard.groupGoal}</span>
              <span className="font-mono-currency text-sm font-semibold text-accent">
                {groupStats.goalProgress.toFixed(0)}%
              </span>
            </div>
            <Progress value={groupStats.goalProgress} className="h-3" />
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <CurrencyDisplay amount={groupStats.totalSavings} size="sm" />
              <span>/ <CurrencyDisplay amount={groupStats.groupGoal} size="sm" /></span>
            </div>
          </CardContent>
        </Card>

        <SavingsChart data={chartData} />

        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle>{t.dashboard.recentPayments}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-slate-500 text-center py-8">{t.dashboard.noPayments}</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{payment.memberName}</p>
                      <p className="text-xs text-slate-500">
                        {payment.month} {payment.year} ·{" "}
                        {format(new Date(payment.paidAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <CurrencyDisplay amount={payment.amount} size="sm" className="text-accent" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {cloudMode && (
          <Card className="animate-fade-in-up border-dashed border-slate-300">
            <CardHeader>
              <CardTitle className="text-base">{t.dashboard.cloudData}</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto max-h-48 bg-muted border border-border p-3 rounded-lg text-slate-700">
                {JSON.stringify(savings, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
