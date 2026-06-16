"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { MemberProfileView } from "@/components/members/member-profile-view";
import { useData } from "@/lib/hooks/use-data";
import { useAuth } from "@/lib/hooks/use-auth";
import { PageLoading } from "@/components/shared/page-status";
import { t } from "@/lib/somali";

export default function ProfilePage() {
  const { members, loading } = useData();
  const { user } = useAuth();
  const member = members.find((m) => m.id === user?.memberId);

  if (loading) {
    return (
      <PageLayout title={t.nav.profile} subtitle={t.profile.myProfile}>
        <PageLoading />
      </PageLayout>
    );
  }

  if (!member) return null;

  return (
    <PageLayout title={t.nav.profile} subtitle={t.profile.myProfile}>
      <MemberProfileView member={member} />
    </PageLayout>
  );
}
