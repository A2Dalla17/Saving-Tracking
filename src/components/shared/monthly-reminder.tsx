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
    <div className="surface-light bg-card border border-border rounded-2xl p-4 flex items-start gap-3 shadow-sm text-card-foreground animate-fade-in-up">
        <Bell className="h-5 w-5 text-card-foreground shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-heading font-semibold text-card-foreground">{t.reminder.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t.reminder.message.replace("$55", `$${settings.monthlyFee}`)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
  );
}
