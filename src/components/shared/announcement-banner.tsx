"use client";

import { Megaphone, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/hooks/use-data";
import { t } from "@/lib/somali";

export function AnnouncementBanner() {
  const { announcements } = useData();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((a) => (
        <div
          key={a.id}
          className="alert-box-beige relative z-10 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-fade-in-up"
        >
          <Megaphone className="h-5 w-5 shrink-0 mt-0.5 text-[#0f2744]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#0f2744]">{a.message}</p>
            <p className="text-xs mt-1 text-[#0f2744]/65">
              {new Date(a.expiresAt).toLocaleString("so-SO")}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="alert-box-dismiss shrink-0 touch-target"
            onClick={() => setDismissed([...dismissed, a.id])}
            aria-label={t.common.close}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
