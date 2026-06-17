"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { MemberProfileView } from "@/components/members/member-profile-view";
import { useData } from "@/lib/hooks/use-data";
import { useAuth } from "@/lib/hooks/use-auth";
import { resolveProfileMember } from "@/lib/resolve-profile-member";
import { PageLoading, PageStatus } from "@/components/shared/page-status";
import { t } from "@/lib/somali";

export default function ProfilePage() {
  const { members, loading } = useData();
  const { user } = useAuth();
  const member = user ? resolveProfileMember(members, user) : undefined;

  if (loading || !user) {
    return (
      <PageLayout title={t.nav.profile} subtitle={t.profile.myProfile}>
        <PageLoading />
      </PageLayout>
    );
  }

  if (!member) {
    return (
      <PageLayout title={t.nav.profile} subtitle={t.profile.myProfile}>
        <div className="py-12 text-center">
          <PageStatus message={t.profile.notFound} />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t.nav.profile} subtitle={t.profile.myProfile}>
      <MemberProfileView member={member} />
    </PageLayout>
  );
}
