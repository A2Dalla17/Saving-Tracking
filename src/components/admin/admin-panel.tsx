"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Save,
  Lock,
  BookOpen,
  Users,
  Archive,
  Megaphone,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentTable } from "@/components/ledger/payment-table";
import { AdminAnnouncements } from "@/components/admin/admin-announcements";
import { AdminMemberTable } from "@/components/admin/admin-member-table";
import { AdminBin } from "@/components/admin/admin-bin";
import { useData } from "@/lib/hooks/use-data";
import { useAdmin } from "@/lib/hooks/use-admin";
import { getDataMode } from "@/lib/data-store";
import { t } from "@/lib/somali";
import type { AppSettings } from "@/types";

const adminNavItems: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "ledger", label: t.admin.ledger, icon: BookOpen },
  { value: "members", label: t.admin.editTable, icon: Users },
  { value: "bin", label: t.admin.bin, icon: Archive },
  { value: "announcements", label: t.announcements.title, icon: Megaphone },
  { value: "settings", label: t.admin.settings, icon: Settings },
];

export function AdminPanel() {
  const { settings, updateSettings } = useData();
  const { lock } = useAdmin();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings(localSettings);
      toast.success(t.admin.saved);
    } catch {
      toast.error(t.common.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tabs defaultValue="ledger" className="flex flex-col gap-4">
      <TabsList className="admin-wa-nav-list">
        {adminNavItems.map(({ value, label, icon: Icon }) => (
          <TabsTrigger key={value} value={value} className="admin-wa-nav-item">
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="admin-wa-content min-w-0">
        <TabsContent value="ledger" className="mt-0">
          <PaymentTable />
        </TabsContent>
        <TabsContent value="members" className="mt-0">
          <AdminMemberTable />
        </TabsContent>
        <TabsContent value="bin" className="mt-0">
          <AdminBin />
        </TabsContent>
        <TabsContent value="announcements" className="mt-0">
          <AdminAnnouncements />
        </TabsContent>
        <TabsContent value="settings" className="mt-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.groupInfo}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.admin.monthlyFee}</Label>
                <Input
                  type="number"
                  value={localSettings.monthlyFee}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, monthlyFee: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t.admin.groupGoal}</Label>
                <Input
                  type="number"
                  value={localSettings.groupGoal}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, groupGoal: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t.admin.startDate}</Label>
                <Input
                  type="date"
                  value={localSettings.groupStartDate}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, groupStartDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.adminPin}</Label>
                <Input
                  type="password"
                  maxLength={6}
                  value={localSettings.adminPin}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, adminPin: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-2 text-sm text-muted-foreground">
                System: {getDataMode() === "firebase" ? t.settings.connected : t.settings.demo}
              </div>
            </CardContent>
          </Card>
          <Button onClick={handleSaveSettings} disabled={saving} variant="gold">
            <Save className="h-4 w-4" />
            {t.admin.saveAll}
          </Button>
        </TabsContent>
      </div>

      <div className="flex justify-end pt-3 border-t border-white/15">
        <Button onClick={lock} className="admin-lock-btn">
          <Lock className="h-4 w-4 shrink-0" />
          <span>{t.admin.lockAdmin}</span>
        </Button>
      </div>
    </Tabs>
  );
}
