"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { MessageCircle, Trash2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useData } from "@/lib/hooks/use-data";
import { hashPassword, isValidLoginId, isLoginIdTaken } from "@/lib/auth";
import { isValidMemberLoginId, loginIdToEmail, normalizeLoginId } from "@/lib/member-auth";
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
  const { members, settings, createMemberWithAuth, editMember, removeMember } = useData();
  const [editMembers, setEditMembers] = useState<Member[]>(members);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLoginId, setNewLoginId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newContribution, setNewContribution] = useState(settings.monthlyFee);

  useEffect(() => {
    if (!dirty) setEditMembers(members);
  }, [members, dirty]);

  useEffect(() => {
    if (addOpen) setNewContribution(settings.monthlyFee);
  }, [addOpen, settings.monthlyFee]);

  const displayLoginId = (member: Member) =>
    member.loginId ?? (member.email ? normalizeLoginId(member.email) : "");

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
    const loginId = member.email?.trim() ?? displayLoginId(member);
    if (loginId && !isValidLoginId(loginId) && !isValidMemberLoginId(loginId)) return t.admin.loginIdInvalid;
    if (loginId && isLoginIdTaken(editMembers, loginId, member.id)) return t.admin.loginIdTaken;
    if (requireActive || member.loginActive) {
      if (!loginId) return t.admin.loginIdRequired;
      const stored = members.find((m) => m.id === member.id);
      const hasPassword = Boolean(stored?.password || draftPassword?.trim() || stored?.uid);
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
      updates.email = em.email?.trim() ?? loginIdToEmail(displayLoginId(em));
      updates.loginActive = true;
      if (em.status === "removed") updates.status = "active";

      if (!updates.password && !original?.password && !original?.uid) {
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

  const resetAddForm = () => {
    setNewName("");
    setNewLoginId("");
    setNewPassword("");
    setNewContribution(settings.monthlyFee);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginId = normalizeLoginId(newLoginId);

    if (!newName.trim()) {
      toast.error(t.members.nameRequired);
      return;
    }
    if (!isValidMemberLoginId(loginId)) {
      toast.error(t.admin.loginIdInvalidNew);
      return;
    }
    if (isLoginIdTaken(members, loginId)) {
      toast.error(t.admin.loginIdTaken);
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error(t.admin.passwordMinLength);
      return;
    }
    if (!newContribution || newContribution <= 0) {
      toast.error(t.admin.contributionRequired);
      return;
    }

    setAdding(true);
    try {
      await createMemberWithAuth({
        name: newName.trim(),
        loginId,
        password: newPassword,
        contribution: newContribution,
      });
      toast.success(t.members.memberAdded);
      resetAddForm();
      setAddOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.common.error;
      toast.error(message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.members.confirmDelete)) return;
    await removeMember(id);
    toast.success(t.members.memberDeleted);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{t.admin.memberTable}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{t.admin.addMemberHint}</p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            {t.members.addMember}
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 px-2">{t.members.name}</th>
                <th className="py-2 px-2">{t.admin.loginId}</th>
                <th className="py-2 px-2">{t.admin.newPassword}</th>
                <th className="py-2 px-2">{t.profile.monthlyRequired}</th>
                <th className="py-2 px-2">{t.admin.paid}</th>
                <th className="py-2 px-2">{t.admin.status}</th>
                <th className="py-2 px-2">{t.admin.login}</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {editMembers.map((m) => (
                <tr key={m.id} className="border-b border-border text-card-foreground">
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
                      <div className="space-y-1">
                        <Input
                          value={displayLoginId(m)}
                          disabled={Boolean(m.uid)}
                          onChange={(e) => updateField(m.id, "email", loginIdToEmail(e.target.value))}
                          placeholder={t.admin.loginIdNewPlaceholder}
                          className="h-8"
                        />
                        {m.uid && (
                          <p className="text-[10px] text-muted-foreground truncate">{loginIdToEmail(displayLoginId(m))}</p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {isAdminMember(m) || m.uid ? (
                      <span className="text-xs text-muted-foreground">{m.uid ? "Firebase Auth" : "—"}</span>
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
                  <td className="py-2 px-2 text-xs">
                    {isAdminMember(m) ? "—" : m.paid ? t.admin.paidYes : t.admin.paidNo}
                  </td>
                  <td className="py-2 px-2 text-xs">{isAdminMember(m) ? "Maamule" : getStatusLabel(m.status)}</td>
                  <td className="py-2 px-2">
                    <Button
                      size="sm"
                      variant={m.loginActive ? "default" : "outline"}
                      onClick={() => toggleLogin(m)}
                      disabled={isAdminMember(m) || saving || Boolean(m.uid)}
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
                        className="text-card-foreground"
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.members.addMember}</DialogTitle>
            <DialogDescription>{t.admin.addMemberDialogDesc}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-member-name">{t.members.name}</Label>
              <Input
                id="new-member-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t.members.namePlaceholder}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-member-login">{t.admin.loginId}</Label>
              <Input
                id="new-member-login"
                value={newLoginId}
                onChange={(e) => setNewLoginId(e.target.value)}
                placeholder={t.admin.loginIdNewPlaceholder}
                required
              />
              {newLoginId.trim() && (
                <p className="text-xs text-muted-foreground">
                  {t.admin.authEmailPreview}: {loginIdToEmail(newLoginId)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-member-password">{t.admin.newPassword}</Label>
              <Input
                id="new-member-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.admin.newPasswordPlaceholder}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-member-contribution">{t.profile.monthlyRequired}</Label>
              <Input
                id="new-member-contribution"
                type="number"
                min={1}
                value={newContribution}
                onChange={(e) => setNewContribution(Number(e.target.value))}
                required
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
                {t.common.cancel}
              </Button>
              <Button type="submit" variant="gold" disabled={adding}>
                {adding ? t.common.loading : t.members.addMember}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
