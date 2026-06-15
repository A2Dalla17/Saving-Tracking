"use client";

import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MemberCard } from "@/components/members/member-card";
import { useData } from "@/lib/hooks/use-data";
import { getPayingMembers, filterPayingPayments } from "@/lib/member-status";
import { calculateMemberStats, calculateGroupStats } from "@/lib/calculations";
import { t } from "@/lib/somali";

export default function MembersPage() {
  const { members, payments, settings, loading } = useData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white/80">{t.common.loading}</p>
      </div>
    );
  }

  const teamMembers = getPayingMembers(members);
  const payingPayments = filterPayingPayments(members, payments);
  const groupStats = calculateGroupStats(teamMembers, payingPayments, settings);
  const memberStatsList = teamMembers.map((member) =>
    calculateMemberStats(member, payingPayments, groupStats.totalSavings, settings)
  );

  return (
    <div>
      <PageHeader title={t.members.title} subtitle={t.members.subtitle} />

      {teamMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 mb-4">
            <Users className="h-8 w-8 text-accent" />
          </div>
          <p className="text-white/70">{t.members.noMembers}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
          {memberStatsList.map((stats) => (
            <MemberCard key={stats.member.id} stats={stats} />
          ))}
        </div>
      )}
    </div>
  );
}
