"use client";

import { PageHeader } from "@/components/layout/page-header";
import { PaymentTimeline } from "@/components/timeline/payment-timeline";
import { useData } from "@/lib/hooks/use-data";
import { filterPayingPayments } from "@/lib/member-status";
import { t } from "@/lib/somali";

export default function TimelinePage() {
  const { payments, members, loading } = useData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t.timeline.title} subtitle={t.timeline.subtitle} />
      <PaymentTimeline payments={filterPayingPayments(members, payments)} />
    </div>
  );
}
