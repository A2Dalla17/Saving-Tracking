"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/lib/hooks/use-data";
import { t } from "@/lib/somali";

export function AdminAnnouncements() {
  const { postAnnouncement } = useData();
  const [message, setMessage] = useState("");
  const [hours, setHours] = useState(24);
  const [sending, setSending] = useState(false);

  const handlePost = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await postAnnouncement(message.trim(), hours);
      toast.success(t.announcements.posted);
      setMessage("");
    } catch {
      toast.error(t.common.error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-brand flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          {t.announcements.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t.announcements.message}</Label>
          <textarea
            className="flex w-full rounded-xl border border-border bg-white px-4 py-3 text-sm min-h-[100px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={t.announcements.placeholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t.announcements.duration}</Label>
          <Input
            type="number"
            min={1}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">{t.announcements.durationHint}</p>
        </div>
        <Button onClick={handlePost} disabled={sending || !message.trim()} variant="gold">
          <Send className="h-4 w-4" />
          {t.announcements.post}
        </Button>
      </CardContent>
    </Card>
  );
}
