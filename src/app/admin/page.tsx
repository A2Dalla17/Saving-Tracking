"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { PinGuard } from "@/components/shared/pin-guard";
import { AdminPanel } from "@/components/admin/admin-panel";
import { useData } from "@/lib/hooks/use-data";
import { PageLoading } from "@/components/shared/page-status";
import { t } from "@/lib/somali";

export default function AdminPage() {
  const { loading } = useData();

  return (
    <PageLayout title={t.admin.title} subtitle={t.admin.adminOnly}>
      {loading ? (
        <PageLoading />
      ) : (
        <PinGuard description={t.admin.desc}>
          <AdminPanel />
        </PinGuard>
      )}
    </PageLayout>
  );
}
