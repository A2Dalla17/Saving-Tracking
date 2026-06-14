"use client";

import { PageHeader } from "@/components/layout/page-header";
import { MemberProfileView } from "@/components/members/member-profile-view";
import { useData } from "@/lib/hooks/use-data";
import { useAuth } from "@/lib/hooks/use-auth";
import { t } from "@/lib/somali";

export default function ProfilePage() {
  const { members, loading } = useData();
  const { user } = useAuth();
  const member = members.find((m) => m.id === user?.memberId);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted-foreground">{t.common.loading}</p></div>;
  }

  if (!member) return null;

  return (
    <div>
      <PageHeader title={t.nav.profile} subtitle={t.profile.myProfile} />
      <MemberProfileView member={member} />
    </div>
  );
}
