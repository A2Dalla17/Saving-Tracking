"use client";

import { useParams } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { MemberProfileView } from "@/components/members/member-profile-view";
import { useData } from "@/lib/hooks/use-data";
import { PageLoading, PageStatus } from "@/components/shared/page-status";
import { t } from "@/lib/somali";

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { members, loading } = useData();
  const member = members.find((m) => m.id === id);

  if (loading) {
    return (
      <PageLayout title={t.profile.title}>
        <PageLoading />
      </PageLayout>
    );
  }

  if (!member) {
    return (
      <PageLayout title={t.profile.title}>
        <div className="py-12 text-center">
          <PageStatus message={t.profile.notFound} />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t.profile.title} subtitle={member.name}>
      <MemberProfileView member={member} />
    </PageLayout>
  );
}
