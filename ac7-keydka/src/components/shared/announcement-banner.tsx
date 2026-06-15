"use client";

import { Megaphone, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/hooks/use-data";

export function AnnouncementBanner() {
  const { announcements } = useData();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visible.map((a) => (
        <div key={a.id} className="brand-gradient rounded-2xl p-4 text-white flex items-start gap-3 shadow-md animate-fade-in-up">
          <Megaphone className="h-5 w-5 text-gold shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{a.message}</p>
            <p className="text-xs text-white/60 mt-1">
              {new Date(a.expiresAt).toLocaleString("so-SO")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 shrink-0"
            onClick={() => setDismissed([...dismissed, a.id])}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
