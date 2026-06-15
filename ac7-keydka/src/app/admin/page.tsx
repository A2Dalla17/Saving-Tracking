"use client";

import { PageHeader } from "@/components/layout/page-header";
import { PinGuard } from "@/components/shared/pin-guard";
import { AdminPanel } from "@/components/admin/admin-panel";
import { useData } from "@/lib/hooks/use-data";
import { t } from "@/lib/somali";

export default function AdminPage() {
  const { loading } = useData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <PinGuard title={t.admin.title} description={t.admin.desc}>
      <div>
        <PageHeader title={t.admin.title} subtitle={t.admin.adminOnly} />
        <AdminPanel />
      </div>
    </PinGuard>
  );
}
