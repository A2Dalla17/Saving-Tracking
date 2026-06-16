"use client";

import { Check, CheckCircle2, XCircle, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { useData } from "@/lib/hooks/use-data";
import {
  calculateMemberStats,
  calculateGroupStats,
  getMonthName,
  getCurrentMonthKey,
  formatMonthKey,
  formatCurrency,
} from "@/lib/calculations";
import { getPayingMembers, filterPayingPayments } from "@/lib/member-status";
import { t } from "@/lib/somali";

export function PaymentTable() {
  const { members, payments, settings, recordPayment, removePayment } = useData();
  const payingMembers = getPayingMembers(members);
  const payingPayments = filterPayingPayments(members, payments);
  const groupStats = calculateGroupStats(payingMembers, payingPayments, settings);
  const currentMonth = getMonthName();
  const currentMonthKey = getCurrentMonthKey();

  const getCurrentMonthPayment = (memberId: string) =>
    payments.find(
      (p) =>
        p.memberId === memberId &&
        formatMonthKey(p.year, p.month) === currentMonthKey
    );

  const handleUndoPayment = async (memberId: string, memberName: string) => {
    const payment = getCurrentMonthPayment(memberId);
    if (!payment) return;
    if (!confirm(t.ledger.confirmUndo.replace("{name}", memberName))) return;
    try {
      await removePayment(payment.id);
      toast.success(t.ledger.paymentUndone);
    } catch {
      toast.error(t.common.error);
    }
  };

  const memberStatsList = payingMembers.map((member) =>
    calculateMemberStats(member, payingPayments, groupStats.totalSavings, settings)
  );

  const handleTickPayment = async (memberId: string, memberName: string, amount: number) => {
    const now = new Date();
    try {
      await recordPayment({
        memberId,
        memberName,
        amount,
        month: getMonthName(now),
        year: now.getFullYear(),
        paidAt: now.toISOString(),
      });
      toast.success(t.ledger.paymentTicked);
    } catch {
      toast.error(t.common.error);
    }
  };

  if (payingMembers.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          {t.members.noMembers}
        </CardContent>
      </Card>
    );
  }

  const allPaid = memberStatsList.every((ms) => ms.isCurrentMonthPaid);

  return (
    <Card className="animate-fade-in-up">
      <CardHeader>
        <CardTitle>
          {currentMonth} — {t.ledger.month}
        </CardTitle>
        {allPaid && <p className="text-sm text-card-foreground font-medium">{t.ledger.allPaid}</p>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t.ledger.member}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t.ledger.status}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t.ledger.amount}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">{t.ledger.action}</th>
              </tr>
            </thead>
            <tbody>
              {memberStatsList.map((ms) => (
                <tr key={ms.member.id} className="border-b border-border hover:bg-muted transition-colors">
                  <td className="py-4 px-4">
                    <span className="font-medium text-card-foreground">{ms.member.name}</span>
                    {ms.consecutiveMissed > 0 && !ms.isCurrentMonthPaid && (
                      <span className="block text-xs text-card-foreground">{t.ledger.escalated}</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {ms.isCurrentMonthPaid ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-card-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        {t.members.paid}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm text-card-foreground">
                        <XCircle className="h-4 w-4" />
                        {t.members.unpaid}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {ms.isCurrentMonthPaid ? (
                      <CurrencyDisplay amount={ms.currentMonthDue} size="sm" />
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground min-w-[52px]">{t.ledger.thisMonth}:</span>
                          <CurrencyDisplay amount={ms.memberMonthlyFee} size="sm" />
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground min-w-[52px]">{t.ledger.nextMonth}:</span>
                          <CurrencyDisplay amount={ms.nextMonthDue} size="sm" className="text-card-foreground" />
                        </div>
                        {settings.lateFeeEscalation && ms.consecutiveMissed === 0 && (
                          <p className="text-xs text-card-foreground font-medium">
                            {formatCurrency(ms.memberMonthlyFee)} + {formatCurrency(ms.memberMonthlyFee)} = {formatCurrency(ms.nextMonthDue)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">{t.ledger.feeDoubleHint}</p>
                        {ms.consecutiveMissed > 0 && (
                          <p className="text-xs text-card-foreground">
                            {t.ledger.escalated} — {t.ledger.thisMonth}: {formatCurrency(ms.currentMonthDue)}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {ms.isCurrentMonthPaid ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-card-foreground border-border hover:bg-muted"
                        onClick={() => handleUndoPayment(ms.member.id, ms.member.name)}
                      >
                        <Undo2 className="h-4 w-4" />
                        {t.ledger.undoPayment}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="gold"
                        onClick={() => handleTickPayment(ms.member.id, ms.member.name, ms.currentMonthDue)}
                      >
                        <Check className="h-4 w-4" />
                        {t.ledger.tickPayment}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
