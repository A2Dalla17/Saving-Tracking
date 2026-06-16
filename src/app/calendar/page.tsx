"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { PaymentCalendar } from "@/components/calendar/payment-calendar";
import { useData } from "@/lib/hooks/use-data";
import { filterPayingPayments } from "@/lib/member-status";
import { PageLoading } from "@/components/shared/page-status";
import { t } from "@/lib/somali";

export default function CalendarPage() {
  const { payments, members, loading } = useData();

  if (loading) {
    return (
      <PageLayout title={t.calendar.title} subtitle={t.calendar.subtitle}>
        <PageLoading />
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t.calendar.title} subtitle={t.calendar.subtitle}>
      <PaymentCalendar payments={filterPayingPayments(members, payments)} />
    </PageLayout>
  );
}
