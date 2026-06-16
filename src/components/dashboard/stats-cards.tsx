"use client";

import { PiggyBank, AlertTriangle, Users, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { t } from "@/lib/somali";
import type { GroupStats } from "@/types";

interface StatsCardsProps {
  stats: GroupStats;
}

const cards = [
  {
    key: "totalSavings" as const,
    label: t.dashboard.totalSavings,
    icon: PiggyBank,
    color: "text-card-foreground",
    bg: "bg-muted",
    getValue: (s: GroupStats) => s.totalSavings,
  },
  {
    key: "totalDebt" as const,
    label: t.dashboard.totalDebt,
    icon: AlertTriangle,
    color: "text-card-foreground",
    bg: "bg-muted",
    getValue: (s: GroupStats) => s.totalDebt,
  },
  {
    key: "members" as const,
    label: t.dashboard.members,
    icon: Users,
    color: "text-card-foreground",
    bg: "bg-muted",
    getValue: (s: GroupStats) => s.memberCount,
    isCount: true,
  },
  {
    key: "goal" as const,
    label: t.dashboard.groupGoal,
    icon: Target,
    color: "text-card-foreground",
    bg: "bg-muted",
    getValue: (s: GroupStats) => s.groupGoal,
    isGoal: true,
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
      {cards.map((card, i) => {
        const Icon = card.icon;
        const value = card.getValue(stats);
        return (
          <Card
            key={card.key}
            className="animate-fade-in-up overflow-hidden transition-colors"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                  {card.isCount ? (
                    <p className="font-mono-currency text-2xl sm:text-3xl font-bold text-card-foreground">{value}</p>
                  ) : card.isGoal ? (
                    <div>
                      <CurrencyDisplay amount={value as number} size="lg" className="text-card-foreground" />
                      <p className="text-xs text-muted-foreground mt-1">{stats.goalProgress.toFixed(0)}% gaaray</p>
                    </div>
                  ) : (
                    <CurrencyDisplay amount={value as number} size="lg" className="text-card-foreground" />
                  )}
                </div>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.bg}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
