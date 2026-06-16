"use client";

import { Users } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { MemberCard } from "@/components/members/member-card";
import { useData } from "@/lib/hooks/use-data";
import { getPayingMembers, filterPayingPayments } from "@/lib/member-status";
import { calculateMemberStats, calculateGroupStats } from "@/lib/calculations";
import { PageLoading } from "@/components/shared/page-status";
import { t } from "@/lib/somali";

export default function MembersPage() {
  const { members, payments, settings, loading } = useData();

  if (loading) {
    return (
      <PageLayout title={t.members.title} subtitle={t.members.subtitle}>
        <PageLoading />
      </PageLayout>
    );
  }

  const teamMembers = getPayingMembers(members);
  const payingPayments = filterPayingPayments(members, payments);
  const groupStats = calculateGroupStats(teamMembers, payingPayments, settings);
  const memberStatsList = teamMembers.map((member) =>
    calculateMemberStats(member, payingPayments, groupStats.totalSavings, settings)
  );

  return (
    <PageLayout title={t.members.title} subtitle={t.members.subtitle}>
      {teamMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 mb-4">
            <Users className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground">{t.members.noMembers}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
          {memberStatsList.map((stats) => (
            <MemberCard key={stats.member.id} stats={stats} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
