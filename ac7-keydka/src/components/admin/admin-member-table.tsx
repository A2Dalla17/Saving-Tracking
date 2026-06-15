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

const EDIT_FIELDS: (keyof Member)[] = [
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

export function AdminMemberTable() {
  const { members, settings, createMember, editMember, removeMember } = useData();
  const [editMembers, setEditMembers] = useState<Member[]>(members);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setEditMembers(members);
  }, [members, dirty]);

  const updateField = (id: string, field: keyof Member, value: string | number | boolean) => {
    setDirty(true);
    setEditMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const updatePasswordDraft = (id: string, value: string) => {
    setDirty(true);
    setPasswordDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const validateMemberCredentials = (
    member: Member,
    draftPassword?: string,
    requireActive = false
  ): string | null => {
    if (isAdminMember(member)) return null;
    const loginId = member.email?.trim() ?? "";
    if (loginId && !isValidLoginId(loginId)) return t.admin.loginIdInvalid;
    if (loginId && isLoginIdTaken(editMembers, loginId, member.id)) return t.admin.loginIdTaken;
    if (requireActive || member.loginActive) {
      if (!loginId) return t.admin.loginIdRequired;
      const stored = members.find((m) => m.id === member.id);
      const hasPassword = Boolean(stored?.password || draftPassword?.trim());
      if (!hasPassword) return t.admin.passwordRequired;
    }
    return null;
  };

  const buildUpdates = (
    em: Member,
    original: Member | undefined,
    draftPassword?: string
  ): Partial<Member> => {
    const updates: Partial<Member> = {};
    for (const field of EDIT_FIELDS) {
      if (em[field] !== original?.[field]) {
        (updates as Record<string, unknown>)[field] = em[field];
      }
    }
    const trimmedEmail = em.email?.trim();
    if (trimmedEmail !== original?.email?.trim()) {
      updates.email = trimmedEmail ?? "";
    }
    if (draftPassword) {
      updates.password = hashPassword(draftPassword);
    }
    return updates;
  };

  const handleSave = async () => {
    for (const em of editMembers) {
      const error = validateMemberCredentials(em, passwordDrafts[em.id], em.loginActive);
      if (error) {
        toast.error(`${em.name}: ${error}`);
        return;
      }
    }

    setSaving(true);
    try {
      for (const em of editMembers) {
        const original = members.find((m) => m.id === em.id);
        const updates = buildUpdates(em, original, passwordDrafts[em.id]?.trim());
        if (Object.keys(updates).length > 0) {
          await editMember(em.id, updates);
        }
      }
      setPasswordDrafts({});
      setDirty(false);
      toast.success(t.admin.saved);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.common.error;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleLogin = async (em: Member) => {
    const original = members.find((m) => m.id === em.id);
    const draftPassword = passwordDrafts[em.id]?.trim();
    const activating = !em.loginActive;

    if (activating) {
      const error = validateMemberCredentials(em, draftPassword, true);
      if (error) {
        toast.error(error);
        return;
      }

      const updates = buildUpdates(em, original, draftPassword);
      updates.email = em.email?.trim() ?? "";
      updates.loginActive = true;
      if (em.status === "removed") updates.status = "active";

      if (!updates.password && !original?.password) {
        toast.error(t.admin.passwordRequired);
        return;
      }

      setSaving(true);
      try {
        await editMember(em.id, updates);
        setEditMembers((prev) =>
          prev.map((m) =>
            m.id === em.id
              ? {
                  ...m,
                  ...updates,
                  password: updates.password ?? m.password,
                  loginActive: true,
                }
              : m
          )
        );
        setPasswordDrafts((prev) => {
          const next = { ...prev };
          delete next[em.id];
          return next;
        });
        setDirty(false);
        toast.success(t.admin.loginActivated);
      } catch {
        toast.error(t.common.error);
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      await editMember(em.id, { loginActive: false });
      setEditMembers((prev) =>
        prev.map((m) => (m.id === em.id ? { ...m, loginActive: false } : m))
      );
      toast.success(t.admin.loginDeactivated);
    } catch {
      toast.error(t.common.error);
    }
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
                    disabled={isAdminMember(m) || saving}
                  >
                    {m.loginActive ? t.admin.active : t.admin.saveAndActivate}
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
