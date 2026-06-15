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
    <div className="mb-6 animate-fade-in-up">
      <div className="brand-gradient rounded-2xl p-4 text-white flex items-start gap-3 shadow-lg">
        <Bell className="h-5 w-5 text-gold shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-heading font-semibold text-gold">{t.reminder.title}</h3>
          <p className="text-sm text-white/90 mt-1">
            {t.reminder.message.replace("$55", `$${settings.monthlyFee}`)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          className="text-white hover:bg-white/20 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
