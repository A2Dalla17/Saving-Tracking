"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Send, AlertTriangle, User, Mail, Phone, Target, Trash2, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { useData } from "@/lib/hooks/use-data";
import { useAuth } from "@/lib/hooks/use-auth";
import { calculateMemberStats, calculateGroupStats } from "@/lib/calculations";
import { getStatusLabel } from "@/lib/member-status";
import { processProfileImage } from "@/lib/avatar";
import { t } from "@/lib/somali";
import type { Member } from "@/types";

interface MemberProfileViewProps {
  member: Member;
}

export function MemberProfileView({ member }: MemberProfileViewProps) {
  const { payments, settings, chats, sendChat, removeChat, editMember } = useData();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const groupStats = calculateGroupStats([member], payments, settings);
  const stats = calculateMemberStats(member, payments, groupStats.totalSavings, settings);
  const memberChats = chats.filter((c) => c.memberId === member.id);
  const isOwnProfile = user?.memberId === member.id;
  const isAdmin = user?.isAdmin;

  const handleSend = async () => {
    if (!message.trim()) return;
    await sendChat(member.id, message.trim(), isAdmin ?? false);
    setMessage("");
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!confirm(t.profile.confirmDeleteChat)) return;
    try {
      await removeChat(chatId);
      toast.success(t.profile.chatDeleted);
    } catch {
      toast.error(t.common.error);
    }
  };

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
    <div className="space-y-6 max-w-3xl mx-auto">
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
              <p className="text-sm text-slate-500">{getStatusLabel(member.status)}</p>
              {isOwnProfile && member.avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 px-2 text-xs text-slate-500"
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
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{member.email}</p>
            )}
            {member.phone && (
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{member.phone}</p>
            )}
            <p className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400" />{t.members.joinDate}: {new Date(member.joinDate).toLocaleDateString("so-SO")}</p>
            <p className="flex items-center gap-2"><Target className="h-4 w-4 text-gold" />{t.profile.annualTarget}: <CurrencyDisplay amount={stats.annualTarget} size="sm" /></p>
          </div>

          {member.status === "warning" && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gold/10 border border-gold/30 text-sm">
              <AlertTriangle className="h-6 w-6 text-gold shrink-0" />
              <div>
                <p className="font-semibold text-sky-700">{t.profile.lastWarning}</p>
                <p className="text-slate-600">{t.profile.warningDesc}</p>
              </div>
            </div>
          )}

          {member.status === "removed" && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {t.profile.removedDesc}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-muted text-center">
              <p className="text-xs text-slate-500">{t.members.totalPaid}</p>
              <CurrencyDisplay amount={stats.totalPaid} size="sm" className="text-slate-900" />
            </div>
            <div className="p-3 rounded-xl bg-muted text-center">
              <p className="text-xs text-slate-500">{t.members.share}</p>
              <p className="font-mono-currency font-bold text-slate-900">{stats.sharePercent.toFixed(1)}%</p>
            </div>
            <div className="p-3 rounded-xl bg-muted text-center">
              <p className="text-xs text-slate-500">{t.profile.monthlyRequired}</p>
              <CurrencyDisplay amount={stats.memberMonthlyFee} size="sm" />
            </div>
            <div className="p-3 rounded-xl bg-muted text-center">
              <p className="text-xs text-slate-500">{t.members.debt}</p>
              <CurrencyDisplay amount={stats.debt} size="sm" className={stats.debt > 0 ? "text-destructive" : "text-success"} />
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

      {(isOwnProfile || isAdmin) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.profile.chat}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-48 overflow-y-auto space-y-2">
              {memberChats.length === 0 ? (
                  <p className="text-sm text-slate-500">{t.profile.noChat}</p>
              ) : (
                memberChats.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl text-sm max-w-[85%] ${
                      c.fromAdmin ? "bg-brand/10 ml-auto text-right" : "bg-muted"
                    }`}
                  >
                    <p>{c.message}</p>
                    <div className={`flex items-center gap-2 mt-1 ${c.fromAdmin ? "justify-end" : ""}`}>
                  <p className="text-xs text-slate-400">
                        {new Date(c.sentAt).toLocaleString("so-SO")}
                      </p>
                      {isAdmin && c.fromAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteChat(c.id)}
                          title={t.profile.deleteChat}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={t.profile.chatPlaceholder}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button onClick={handleSend} size="icon"><Send className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
