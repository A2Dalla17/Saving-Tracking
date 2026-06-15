"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Lock } from "lucide-react";
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

export function AdminPanel() {
  const { settings, updateSettings } = useData();
  const { lock } = useAdmin();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocalSettings(settings); }, [settings]);

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
    <Tabs defaultValue="ledger" className="space-y-6">
      <TabsList className="w-full flex-wrap h-auto gap-1">
        <TabsTrigger value="ledger">{t.admin.ledger}</TabsTrigger>
        <TabsTrigger value="members">{t.admin.editTable}</TabsTrigger>
        <TabsTrigger value="bin">{t.admin.bin}</TabsTrigger>
        <TabsTrigger value="announcements">{t.announcements.title}</TabsTrigger>
        <TabsTrigger value="settings">{t.admin.settings}</TabsTrigger>
      </TabsList>

      <TabsContent value="ledger"><PaymentTable /></TabsContent>
      <TabsContent value="members"><AdminMemberTable /></TabsContent>
      <TabsContent value="bin"><AdminBin /></TabsContent>
      <TabsContent value="announcements"><AdminAnnouncements /></TabsContent>

      <TabsContent value="settings" className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-brand">{t.settings.groupInfo}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.admin.monthlyFee}</Label>
              <Input type="number" value={localSettings.monthlyFee} onChange={(e) => setLocalSettings({ ...localSettings, monthlyFee: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>{t.admin.groupGoal}</Label>
              <Input type="number" value={localSettings.groupGoal} onChange={(e) => setLocalSettings({ ...localSettings, groupGoal: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>{t.admin.startDate}</Label>
              <Input type="date" value={localSettings.groupStartDate} onChange={(e) => setLocalSettings({ ...localSettings, groupStartDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.adminPin}</Label>
              <Input type="password" maxLength={6} value={localSettings.adminPin} onChange={(e) => setLocalSettings({ ...localSettings, adminPin: e.target.value })} />
            </div>
            <div className="md:col-span-2 text-sm text-muted-foreground">
              System: {getDataMode() === "supabase" ? t.settings.connected : t.settings.demo}
            </div>
          </CardContent>
        </Card>
        <Button onClick={handleSaveSettings} disabled={saving} variant="gold">
          <Save className="h-4 w-4" />{t.admin.saveAll}
        </Button>
      </TabsContent>

      <div className="flex justify-end pt-4 border-t border-border">
        <Button variant="outline" onClick={lock}><Lock className="h-4 w-4" />{t.admin.lockAdmin}</Button>
      </div>
    </Tabs>
  );
}
