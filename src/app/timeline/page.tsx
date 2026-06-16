"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { PaymentTimeline } from "@/components/timeline/payment-timeline";
import { useData } from "@/lib/hooks/use-data";
import { filterPayingPayments } from "@/lib/member-status";
import { PageLoading } from "@/components/shared/page-status";
import { t } from "@/lib/somali";

export default function TimelinePage() {
  const { payments, members, loading } = useData();

  if (loading) {
    return (
      <PageLayout title={t.timeline.title} subtitle={t.timeline.subtitle}>
        <PageLoading />
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t.timeline.title} subtitle={t.timeline.subtitle}>
      <PaymentTimeline payments={filterPayingPayments(members, payments)} />
    </PageLayout>
  );
}
