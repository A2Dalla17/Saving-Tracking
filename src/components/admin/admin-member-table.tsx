"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { MessageCircle, Trash2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/lib/hooks/use-data";
import { hashPassword, isValidLoginId, isLoginIdTaken } from "@/lib/auth";
import { getStatusLabel, isAdminMember } from "@/lib/member-status";
import { t } from "@/lib/somali";
import type { Member } from "@/types";

export function AdminMemberTable() {
  const { members, settings, createMember, editMember, removeMember } = useData();
  const [editMembers, setEditMembers] = useState<Member[]>(members);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditMembers(members);
  }, [members]);

  const updateField = (id: string, field: keyof Member, value: string | number | boolean) => {
    setEditMembers(editMembers.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const updatePasswordDraft = (id: string, value: string) => {
    setPasswordDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const validateMemberCredentials = (member: Member, draftPassword?: string): string | null => {
    if (isAdminMember(member)) return null;
    const loginId = member.email?.trim() ?? "";
    if (loginId && !isValidLoginId(loginId)) return t.admin.loginIdInvalid;
    if (loginId && isLoginIdTaken(editMembers, loginId, member.id)) return t.admin.loginIdTaken;
    if (member.loginActive) {
      if (!loginId) return t.admin.loginIdRequired;
      if (!member.password && !draftPassword?.trim()) return t.admin.passwordRequired;
    }
    return null;
  };

  const handleSave = async () => {
    for (const em of editMembers) {
      const error = validateMemberCredentials(em, passwordDrafts[em.id]);
      if (error) {
        toast.error(`${em.name}: ${error}`);
        return;
      }
    }

    setSaving(true);
    try {
      for (const em of editMembers) {
        const original = members.find((m) => m.id === em.id);
        const draftPassword = passwordDrafts[em.id]?.trim();
        const updates: Partial<Member> = {};

        if (original) {
          const fields: (keyof Member)[] = [
            "name",
            "email",
            "phone",
            "monthlyFee",
            "annualTarget",
            "joinDate",
            "endDate",
            "loginActive",
            "status",
          ];
          for (const field of fields) {
            if (em[field] !== original[field]) {
              (updates as Record<string, unknown>)[field] = em[field];
            }
          }
        }

        if (draftPassword) {
          updates.password = hashPassword(draftPassword);
        }

        if (Object.keys(updates).length > 0) {
          await editMember(em.id, updates);
        }
      }
      setPasswordDrafts({});
      toast.success(t.admin.saved);
    } catch {
      toast.error(t.common.error);
    } finally {
      setSaving(false);
    }
  };

  const toggleLogin = async (member: Member) => {
    const newVal = !member.loginActive;
    if (newVal) {
      const draftPassword = passwordDrafts[member.id];
      const error = validateMemberCredentials(member, draftPassword);
      if (error) {
        toast.error(error);
        return;
      }
      if (draftPassword) {
        await editMember(member.id, { password: hashPassword(draftPassword), loginActive: true });
        setPasswordDrafts((prev) => {
          const next = { ...prev };
          delete next[member.id];
          return next;
        });
        toast.success(t.admin.loginActivated);
        return;
      }
    }

    const updates: Partial<Member> = { loginActive: newVal };
    if (newVal && member.status === "removed") updates.status = "active";
    await editMember(member.id, updates);
    toast.success(newVal ? t.admin.loginActivated : t.admin.loginDeactivated);
  };

  const handleAdd = async () => {
    await createMember({
      name: "Xubin Cusub",
      email: "",
      joinDate: settings.groupStartDate,
      loginActive: false,
      status: "active",
      monthlyFee: settings.monthlyFee,
      annualTarget: settings.monthlyFee * 12,
    });
    toast.success(t.members.memberAdded);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.members.confirmDelete)) return;
    await removeMember(id);
    toast.success(t.members.memberDeleted);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-brand">{t.admin.memberTable}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{t.admin.loginSetupHint}</p>
        </div>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          {t.members.addMember}
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1050px]">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 px-2">{t.members.name}</th>
              <th className="py-2 px-2">{t.admin.loginId}</th>
              <th className="py-2 px-2">{t.admin.newPassword}</th>
              <th className="py-2 px-2">{t.profile.monthlyRequired}</th>
              <th className="py-2 px-2">{t.profile.annualTarget}</th>
              <th className="py-2 px-2">{t.admin.status}</th>
              <th className="py-2 px-2">{t.admin.login}</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {editMembers.map((m) => (
              <tr key={m.id} className="border-b border-border/50">
                <td className="py-2 px-2">
                  <Input
                    value={m.name}
                    onChange={(e) => updateField(m.id, "name", e.target.value)}
                    className="h-8"
                  />
                </td>
                <td className="py-2 px-2">
                  {isAdminMember(m) ? (
                    <Input value={m.email ?? ""} disabled className="h-8 bg-muted" />
                  ) : (
                    <Input
                      value={m.email ?? ""}
                      onChange={(e) => updateField(m.id, "email", e.target.value)}
                      placeholder={t.admin.loginIdPlaceholder}
                      className="h-8"
                    />
                  )}
                </td>
                <td className="py-2 px-2">
                  {isAdminMember(m) ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <Input
                      type="password"
                      value={passwordDrafts[m.id] ?? ""}
                      onChange={(e) => updatePasswordDraft(m.id, e.target.value)}
                      placeholder={m.password ? "••••••••" : t.admin.newPasswordPlaceholder}
                      className="h-8"
                    />
                  )}
                </td>
                <td className="py-2 px-2">
                  {isAdminMember(m) ? (
                    <span className="text-xs text-muted-foreground">Maamule</span>
                  ) : (
                    <Input
                      type="number"
                      value={m.monthlyFee ?? settings.monthlyFee}
                      onChange={(e) => updateField(m.id, "monthlyFee", Number(e.target.value))}
                      className="h-8 w-20"
                    />
                  )}
                </td>
                <td className="py-2 px-2">
                  {isAdminMember(m) ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <Input
                      type="number"
                      value={m.annualTarget ?? 0}
                      onChange={(e) => updateField(m.id, "annualTarget", Number(e.target.value))}
                      className="h-8 w-24"
                    />
                  )}
                </td>
                <td className="py-2 px-2 text-xs">{isAdminMember(m) ? "Maamule" : getStatusLabel(m.status)}</td>
                <td className="py-2 px-2">
                  <Button
                    size="sm"
                    variant={m.loginActive ? "default" : "outline"}
                    onClick={() => toggleLogin(m)}
                    disabled={isAdminMember(m)}
                  >
                    {m.loginActive ? t.admin.active : t.admin.inactive}
                  </Button>
                </td>
                <td className="py-2 px-2">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/members/${m.id}`}>
                        <MessageCircle className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(m.id)}
                      className="text-destructive"
                      disabled={isAdminMember(m)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button onClick={handleSave} disabled={saving} className="mt-4" variant="gold">
          <Save className="h-4 w-4" />
          {t.admin.saveAll}
        </Button>
      </CardContent>
    </Card>
  );
}
