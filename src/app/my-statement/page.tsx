"use client";

import { PageHeader } from "@/components/layout/page-header";
import { MyStatementPortal } from "@/components/statements/my-statement-portal";
import { useData } from "@/lib/hooks/use-data";
import { t } from "@/lib/somali";

export default function MyStatementPage() {
  const { loading } = useData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t.myStatement.title} subtitle={t.myStatement.subtitle} />
      <MyStatementPortal />
    </div>
  );
}
