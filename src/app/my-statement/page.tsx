"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { MyStatementPortal } from "@/components/statements/my-statement-portal";
import { useData } from "@/lib/hooks/use-data";
import { PageLoading } from "@/components/shared/page-status";
import { t } from "@/lib/somali";

export default function MyStatementPage() {
  const { loading } = useData();

  if (loading) {
    return (
      <PageLayout title={t.myStatement.title} subtitle={t.myStatement.subtitle}>
        <PageLoading />
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t.myStatement.title} subtitle={t.myStatement.subtitle}>
      <MyStatementPortal />
    </PageLayout>
  );
}
