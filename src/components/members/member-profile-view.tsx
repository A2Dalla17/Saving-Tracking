"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, User, Mail, Phone, Target, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { useData } from "@/lib/hooks/use-data";
import { useAuth } from "@/lib/hooks/use-auth";
import { calculateMemberStats, calculateGroupStats } from "@/lib/calculations";
import { getStatusLabel } from "@/lib/member-status";
import { processProfileImage } from "@/lib/avatar";
import { GroupAdminChat } from "@/components/shared/group-admin-chat";
import { t } from "@/lib/somali";
import type { Member } from "@/types";

interface MemberProfileViewProps {
  member: Member;
}

export function MemberProfileView({ member }: MemberProfileViewProps) {
  const { payments, settings, editMember } = useData();
  const { user } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const groupStats = calculateGroupStats([member], payments, settings);
  const stats = calculateMemberStats(member, payments, groupStats.totalSavings, settings);
  const isOwnProfile =
    user?.memberId === member.id ||
    user?.memberId === member.uid ||
    (user?.email && member.email?.toLowerCase() === user.email.toLowerCase());

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const avatarUrl = await processProfileImage(file);
      await editMember(member.id, { avatarUrl });
      toast.success(t.profile.photoUpdated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    try {
      await editMember(member.id, { avatarUrl: "" });
      toast.success(t.profile.photoRemoved);
    } catch {
      toast.error(t.common.error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <MemberAvatar member={member} size="md" />
              {isOwnProfile && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-label={t.profile.changePhoto}
                    onChange={handlePhotoSelect}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    title={t.profile.changePhoto}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-2xl">{member.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{getStatusLabel(member.status)}</p>
              {isOwnProfile && member.avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 px-2 text-xs text-muted-foreground"
                  disabled={uploadingPhoto}
                  onClick={handleRemovePhoto}
                >
                  <X className="h-3 w-3" />
                  {t.profile.removePhoto}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {member.email && (
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{member.email}</p>
            )}
            {member.phone && (
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{member.phone}</p>
            )}
            <p className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{t.members.joinDate}: {new Date(member.joinDate).toLocaleDateString("so-SO")}</p>
            <p className="flex items-center gap-2"><Target className="h-4 w-4 text-gold" />{t.profile.annualTarget}: <CurrencyDisplay amount={stats.annualTarget} size="sm" /></p>
          </div>

          {member.status === "warning" && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gold/10 border border-gold/30 text-sm">
              <AlertTriangle className="h-6 w-6 text-gold shrink-0" />
              <div>
                <p className="font-semibold text-card-foreground">{t.profile.lastWarning}</p>
                <p className="text-muted-foreground">{t.profile.warningDesc}</p>
              </div>
            </div>
          )}

          {member.status === "removed" && (
            <div className="p-4 rounded-xl bg-muted border border-border text-sm text-card-foreground">
              {t.profile.removedDesc}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-muted text-center">
              <p className="text-xs text-muted-foreground">{t.members.totalPaid}</p>
              <CurrencyDisplay amount={stats.totalPaid} size="sm" className="text-card-foreground" />
            </div>
            <div className="p-3 rounded-xl bg-muted text-center">
              <p className="text-xs text-muted-foreground">{t.members.share}</p>
              <p className="font-mono-currency font-bold text-card-foreground">{stats.sharePercent.toFixed(1)}%</p>
            </div>
            <div className="p-3 rounded-xl bg-muted text-center">
              <p className="text-xs text-muted-foreground">{t.profile.monthlyRequired}</p>
              <CurrencyDisplay amount={stats.memberMonthlyFee} size="sm" />
            </div>
            <div className="p-3 rounded-xl bg-muted text-center">
              <p className="text-xs text-muted-foreground">{t.members.debt}</p>
              <CurrencyDisplay amount={stats.debt} size="sm" className="text-card-foreground" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>{t.profile.annualProgress}</span>
              <span className="font-semibold">{stats.annualProgress.toFixed(0)}%</span>
            </div>
            <Progress value={stats.annualProgress} />
          </div>
        </CardContent>
      </Card>

      <GroupAdminChat />
    </div>
  );
}
