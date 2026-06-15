"use client";

import { PageHeader } from "@/components/layout/page-header";
import { PaymentCalendar } from "@/components/calendar/payment-calendar";
import { useData } from "@/lib/hooks/use-data";
import { filterPayingPayments } from "@/lib/member-status";
import { t } from "@/lib/somali";

export default function CalendarPage() {
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
      <PageHeader title={t.calendar.title} subtitle={t.calendar.subtitle} />
      <PaymentCalendar payments={filterPayingPayments(members, payments)} />
    </div>
  );
}
