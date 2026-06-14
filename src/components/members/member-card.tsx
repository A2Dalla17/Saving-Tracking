"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, XCircle, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { getStatusLabel } from "@/lib/member-status";
import { t } from "@/lib/somali";
import type { MemberStats } from "@/types";

interface MemberCardProps {
  stats: MemberStats;
}

export function MemberCard({ stats }: MemberCardProps) {
  const {
    member, totalPaid, debt, sharePercent, isCurrentMonthPaid,
    monthsPaid, memberMonthlyFee, annualTarget, annualProgress, consecutiveMissed,
  } = stats;

  const statusColors = {
    active: "text-success bg-success/10",
    warning: "text-gold bg-gold/20",
    removed: "text-destructive bg-destructive/10",
  };

  return (
    <Link href={`/members/${member.id}`}>
      <Card className="animate-fade-in-up overflow-hidden hover:shadow-lg transition-all border-brand/10 hover:border-brand/30 cursor-pointer h-full">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <MemberAvatar member={member} size="sm" />
              <div className="min-w-0">
              <h3 className="font-heading text-lg font-semibold text-brand">{member.name}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${statusColors[member.status]}`}>
                  {getStatusLabel(member.status)}
                </span>
                {isCurrentMonthPaid ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-lg">
                    <CheckCircle2 className="h-3 w-3" />{t.members.paid}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-lg">
                    <XCircle className="h-3 w-3" />{t.members.unpaid}
                  </span>
                )}
              </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t.members.share}</p>
              <p className="font-mono-currency text-xl font-bold text-brand">{sharePercent.toFixed(1)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div className="p-3 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground">{t.members.totalPaid}</p>
              <CurrencyDisplay amount={totalPaid} size="sm" className="text-brand" />
            </div>
            <div className="p-3 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground">{t.profile.monthlyRequired}</p>
              <CurrencyDisplay amount={memberMonthlyFee} size="sm" />
            </div>
            <div className="p-3 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" />{t.profile.annualTarget}</p>
              <CurrencyDisplay amount={annualTarget} size="sm" className="text-gold" />
            </div>
            <div className="p-3 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground">{t.members.debt}</p>
              <CurrencyDisplay amount={debt} size="sm" className={debt > 0 ? "text-destructive" : "text-success"} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t.profile.annualProgress}</span>
              <span>{annualProgress.toFixed(0)}%</span>
            </div>
            <Progress value={annualProgress} />
            <p className="text-xs text-muted-foreground">{monthsPaid} bil · {consecutiveMissed > 0 && `${consecutiveMissed} bil ma bixin`}</p>
          </div>

          {member.status === "warning" && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gold bg-gold/10 p-2 rounded-lg">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t.profile.lastWarning}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
