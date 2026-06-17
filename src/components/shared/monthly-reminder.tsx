"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shouldShowMonthlyReminder } from "@/lib/calculations";
import { useData } from "@/lib/hooks/use-data";
import { t } from "@/lib/somali";

export function MonthlyReminder() {
  const { settings } = useData();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !shouldShowMonthlyReminder(settings)) return null;

  return (
    <div className="alert-box-orange relative z-10 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-fade-in-up">
        <Bell className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold">{t.reminder.title}</h3>
          <p className="text-sm mt-1 opacity-80">
            {t.reminder.message.replace("$55", `$${settings.monthlyFee}`)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          className="alert-box-dismiss shrink-0 touch-target"
          aria-label={t.common.close}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
  );
}
