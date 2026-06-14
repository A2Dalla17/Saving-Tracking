"use client";

import { format } from "date-fns";
import { CircleDollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { t } from "@/lib/somali";
import type { Payment } from "@/types";

interface PaymentTimelineProps {
  payments: Payment[];
}

export function PaymentTimeline({ payments }: PaymentTimelineProps) {
  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          {t.timeline.noEvents}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((payment, index) => (
        <Card
          key={payment.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple/10">
                <CircleDollarSign className="h-6 w-6 text-purple" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-navy">
                  <span className="text-purple">{payment.memberName}</span>{" "}
                  {t.timeline.paidBy}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.timeline.forMonth} {payment.month} {payment.year} ·{" "}
                  {format(new Date(payment.paidAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <CurrencyDisplay amount={payment.amount} size="sm" className="text-gold shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
