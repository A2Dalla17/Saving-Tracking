"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { MemberProfileView } from "@/components/members/member-profile-view";
import { useData } from "@/lib/hooks/use-data";
import { t } from "@/lib/somali";

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { members, loading } = useData();
  const member = members.find((m) => m.id === id);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted-foreground">{t.common.loading}</p></div>;
  }

  if (!member) {
    return <div className="text-center py-20 text-muted-foreground">{t.profile.notFound}</div>;
  }

  return (
    <div>
      <PageHeader title={t.profile.title} subtitle={member.name} />
      <MemberProfileView member={member} />
    </div>
  );
}
