"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import {
  rowToMember,
  memberToRow,
  rowToPayment,
  paymentToRow,
  rowToSettings,
  settingsToRow,
  rowToAnnouncement,
  announcementToRow,
  rowToChat,
  chatToRow,
  rowToBin,
  rowToSavings,
  savingsToRow,
  paymentToSavings,
} from "./supabase-mappers";
import {
  DEFAULT_SETTINGS,
  DEFAULT_MEMBER_PROFILES,
  DEFAULT_MEMBER_PASSWORD,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from "./constants";
import { hashPassword } from "./auth";
import { generateId } from "./utils";
import type { Member, Payment, AppSettings, Announcement, ChatMessage, ArchivedMemberRecord, Savings } from "@/types";

const STORAGE_KEYS = {
  MEMBERS: "ac7_members",
  PAYMENTS: "ac7_payments",
  SETTINGS: "ac7_settings",
  ANNOUNCEMENTS: "ac7_announcements",
  CHATS: "ac7_chats",
  BIN: "ac7_bin",
  SEEDED: "ac7_seeded",
  MIGRATED: "ac7_migrated_v5",
  CLOUD_MIGRATED: "ac7_cloud_migrated",
};

type Unsubscribe = () => void;

function subscribeRealtime(table: string, reload: () => void): Unsubscribe {
  const supabase = getSupabase();
  if (!supabase) return () => undefined;
  reload();
  const channel: RealtimeChannel = supabase
    .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => reload())
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

async function fetchAllMembers(): Promise<Member[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeMember(rowToMember(row)));
}

async function fetchAllPayments(): Promise<Payment[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => rowToPayment(row));
}

async function fetchSettingsRow(): Promise<AppSettings> {
  const supabase = getSupabase();
  if (!supabase) return DEFAULT_SETTINGS;
  const { data, error } = await supabase.from("app_settings").select("*").eq("id", "app").maybeSingle();
  if (error) throw error;
  return data ? rowToSettings(data) : DEFAULT_SETTINGS;
}

async function fetchAnnouncements(): Promise<Announcement[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const now = Date.now();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => rowToAnnouncement(row))
    .filter((a) => new Date(a.expiresAt).getTime() > now);
}

async function fetchAllChats(): Promise<ChatMessage[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.from("chats").select("*").order("sent_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => rowToChat(row));
}

async function fetchAllSavings(): Promise<Savings[]> {
  const supabase = getSupabase();
  if (!supabase) return getLocalPayments().map((p) => paymentToSavings(p));
  const { data, error } = await supabase
    .from("savings")
    .select("*")
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => rowToSavings(row));
}

async function syncSavingsFromPayments(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { count, error: countError } = await supabase
      .from("savings")
      .select("*", { count: "exact", head: true });
    if (countError) {
      console.error("SUPABASE savings count error:", countError);
      return;
    }
    if ((count ?? 0) > 0) return;

    const payments = await fetchAllPayments();
    if (payments.length === 0) return;

    const { error } = await supabase
      .from("savings")
      .insert(payments.map((p) => savingsToRow(paymentToSavings(p))));
    if (error) console.error("SUPABASE savings sync error:", error);
  } catch (err) {
    console.error("SUPABASE savings sync failed:", err);
  }
}

async function upsertSavingsRecord(payment: Payment): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("savings").upsert(savingsToRow(paymentToSavings(payment)));
  if (error) console.error("SUPABASE savings upsert error:", error);
}

async function removeSavingsRecord(paymentId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("savings").delete().eq("id", paymentId);
  if (error) console.error("SUPABASE savings delete error:", error);
}

async function removeSavingsForMember(memberId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("savings").delete().eq("member_id", memberId);
  if (error) console.error("SUPABASE savings member delete error:", error);
}

async function fetchAllBin(): Promise<ArchivedMemberRecord[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.from("bin").select("*").order("archived_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => rowToBin(row));
}

function dispatchStorage() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("storage"));
  }
}

function normalizeMember(raw: Partial<Member> & { id: string; name: string }): Member {
  const isAdmin =
    raw.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
    raw.name === "Maamulaha";

  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone ?? "",
    email: raw.email ?? "",
    password: raw.password,
    joinDate: raw.joinDate ?? DEFAULT_SETTINGS.groupStartDate,
    endDate: raw.endDate,
    monthlyFee: raw.monthlyFee ?? DEFAULT_SETTINGS.monthlyFee,
    annualTarget: raw.annualTarget ?? DEFAULT_SETTINGS.monthlyFee * 12,
    loginActive: typeof raw.loginActive === "boolean" ? raw.loginActive : isAdmin,
    status: raw.status ?? "active",
    avatarUrl: raw.avatarUrl,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

function profileDefaultsForName(name: string) {
  return DEFAULT_MEMBER_PROFILES.find((p) => p.name === name);
}

function saveToLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    const quota =
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" || e.code === 22);
    throw new Error(
      quota
        ? "Kaydinta browser-ka waa buuxday. Sawirka profile ka saar ama xog yar kaydi."
        : "Kaydinta ma guulaysan"
    );
  }
}

function getLocalMembers(): Member[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
  if (!data) return [];
  return (JSON.parse(data) as Member[]).map((m) => normalizeMember(m));
}

function getLocalPayments(): Payment[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
  return data ? JSON.parse(data) : [];
}

function getLocalSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
}

function getLocalAnnouncements(): Announcement[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
  return data ? JSON.parse(data) : [];
}

function getLocalChats(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEYS.CHATS);
  return data ? JSON.parse(data) : [];
}

function getLocalBin(): ArchivedMemberRecord[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEYS.BIN);
  return data ? JSON.parse(data) : [];
}

function saveLocalBin(bin: ArchivedMemberRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.BIN, JSON.stringify(bin));
}

function saveLocalMembers(members: Member[]): void {
  saveToLocalStorage(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
}

function saveLocalPayments(payments: Payment[]): void {
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
}

function saveLocalSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

function saveLocalAnnouncements(announcements: Announcement[]): void {
  localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
}

function saveLocalChats(chats: ChatMessage[]): void {
  localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
}

function ensureAdminCredentials(): void {
  if (typeof window === "undefined") return;
  const members = getLocalMembers();
  const adminHash = hashPassword(ADMIN_PASSWORD);
  let changed = false;

  const updated = members.map((m) => {
    if (m.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      if (m.password !== adminHash || !m.loginActive) changed = true;
      return { ...m, password: adminHash, loginActive: true };
    }
    return m;
  });

  if (changed) {
    saveLocalMembers(updated);
    dispatchStorage();
  }
}

export async function migrateMembers(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE_KEYS.MIGRATED) === "v5") return;

  const rawData = localStorage.getItem(STORAGE_KEYS.MEMBERS);
  const adminHash = hashPassword(ADMIN_PASSWORD);

  let updated: Member[] = rawData
    ? (JSON.parse(rawData) as Member[]).map((m) => normalizeMember(m))
    : [];

  updated = updated.map((m) =>
    m.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      ? { ...m, password: adminHash, loginActive: true }
      : m
  );

  if (!updated.some((m) => m.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())) {
    updated.unshift(
      normalizeMember({
        id: generateId(),
        name: "Maamulaha",
        email: ADMIN_EMAIL,
        joinDate: DEFAULT_SETTINGS.groupStartDate,
        monthlyFee: 0,
        annualTarget: 0,
        loginActive: true,
        status: "active",
        password: adminHash,
        createdAt: new Date().toISOString(),
      })
    );
  }

  saveLocalMembers(updated);
  localStorage.setItem(STORAGE_KEYS.MIGRATED, "v5");
}

export async function ensureCloudSetup(): Promise<void> {
  if (typeof window === "undefined" || !isSupabaseConfigured()) return;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    await fetch("/api/setup/seed", { method: "POST", signal: controller.signal });
    clearTimeout(timer);
  } catch {
    // seed is best-effort before login
  }

  try {
    await syncSavingsFromPayments();
  } catch {
    // savings sync must not block app load
  }

  if (localStorage.getItem(STORAGE_KEYS.CLOUD_MIGRATED)) return;

  const rawMembers = localStorage.getItem(STORAGE_KEYS.MEMBERS);
  if (!rawMembers) return;

  const members = JSON.parse(rawMembers) as Member[];
  if (members.length === 0) return;

  try {
    const res = await fetch("/api/setup/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        members,
        payments: JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS) ?? "[]"),
        settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) ?? "null") ?? undefined,
        announcements: JSON.parse(localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS) ?? "[]"),
        chats: JSON.parse(localStorage.getItem(STORAGE_KEYS.CHATS) ?? "[]"),
      }),
    });
    const data = await res.json();
    if (res.ok && data.imported) {
      localStorage.setItem(STORAGE_KEYS.CLOUD_MIGRATED, "true");
    }
  } catch {
    // migration can retry on next visit while the database is still empty
  }
}

export async function seedDefaultMembers(): Promise<void> {
  if (typeof window === "undefined") return;

  if (isSupabaseConfigured()) {
    await ensureCloudSetup();
    return;
  }

  ensureAdminCredentials();
  await migrateMembers();
  await archiveRemovedMembers();
  if (localStorage.getItem(STORAGE_KEYS.SEEDED)) return;

  const members = getLocalMembers();
  if (members.length > 0) {
    localStorage.setItem(STORAGE_KEYS.SEEDED, "true");
    return;
  }

  const supabase = getSupabase();
  if (supabase) {
    const { count } = await supabase.from("members").select("*", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      localStorage.setItem(STORAGE_KEYS.SEEDED, "true");
      return;
    }
  }

  for (const profile of DEFAULT_MEMBER_PROFILES) {
    await addMember({
      name: profile.name,
      email: profile.email,
      monthlyFee: profile.monthlyFee,
      annualTarget: profile.annualTarget,
      joinDate: DEFAULT_SETTINGS.groupStartDate,
      loginActive: false,
      status: "active",
      password: hashPassword(DEFAULT_MEMBER_PASSWORD),
    });
  }

  await addMember({
    name: "Maamulaha",
    email: ADMIN_EMAIL,
    joinDate: DEFAULT_SETTINGS.groupStartDate,
    monthlyFee: 0,
    annualTarget: 0,
    loginActive: true,
    status: "active",
    password: hashPassword(ADMIN_PASSWORD),
  });

  localStorage.setItem(STORAGE_KEYS.SEEDED, "true");
}

export function subscribeMembers(callback: (members: Member[]) => void): Unsubscribe {
  const supabase = getSupabase();
  if (!supabase) {
    callback(getLocalMembers());
    const handler = () => callback(getLocalMembers());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  const reload = () => {
    fetchAllMembers()
      .then(callback)
      .catch((err) => {
        console.error("SUPABASE members fetch error:", err);
        callback([]);
      });
  };
  return subscribeRealtime("members", reload);
}

export function subscribePayments(callback: (payments: Payment[]) => void): Unsubscribe {
  const supabase = getSupabase();
  if (!supabase) {
    callback(getLocalPayments());
    const handler = () => callback(getLocalPayments());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  const reload = () => {
    fetchAllPayments()
      .then(callback)
      .catch((err) => {
        console.error("SUPABASE payments fetch error:", err);
        callback([]);
      });
  };
  return subscribeRealtime("payments", reload);
}

export function subscribeSavings(callback: (items: Savings[]) => void): Unsubscribe {
  const supabase = getSupabase();
  if (!supabase) {
    const load = () => callback(getLocalPayments().map((p) => paymentToSavings(p)));
    load();
    const handler = () => load();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  const reload = () => {
    fetchAllSavings()
      .then(callback)
      .catch((err) => {
        console.error("SUPABASE savings fetch error:", err);
        callback([]);
      });
  };
  return subscribeRealtime("savings", reload);
}

export function subscribeSettings(callback: (settings: AppSettings) => void): Unsubscribe {
  const supabase = getSupabase();
  if (!supabase) {
    callback(getLocalSettings());
    const handler = () => callback(getLocalSettings());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  const reload = () => {
    fetchSettingsRow()
      .then(callback)
      .catch((err) => {
        console.error("SUPABASE settings fetch error:", err);
        callback(DEFAULT_SETTINGS);
      });
  };
  return subscribeRealtime("app_settings", reload);
}

export function subscribeAnnouncements(callback: (items: Announcement[]) => void): Unsubscribe {
  const supabase = getSupabase();
  if (!supabase) {
    const load = () => {
      const now = Date.now();
      callback(getLocalAnnouncements().filter((a) => new Date(a.expiresAt).getTime() > now));
    };
    load();
    const handler = () => load();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  const reload = () => {
    fetchAnnouncements()
      .then(callback)
      .catch((err) => {
        console.error("SUPABASE announcements fetch error:", err);
        callback([]);
      });
  };
  return subscribeRealtime("announcements", reload);
}

export function subscribeChats(callback: (messages: ChatMessage[]) => void): Unsubscribe {
  const supabase = getSupabase();
  if (!supabase) {
    callback(getLocalChats());
    const handler = () => callback(getLocalChats());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  const reload = () => {
    fetchAllChats()
      .then(callback)
      .catch((err) => {
        console.error("SUPABASE chats fetch error:", err);
        callback([]);
      });
  };
  return subscribeRealtime("chats", reload);
}

export async function addMember(member: Omit<Member, "id" | "createdAt">): Promise<Member> {
  const profile = profileDefaultsForName(member.name);
  const newMember = normalizeMember({
    ...member,
    id: generateId(),
    createdAt: new Date().toISOString(),
    email: member.email ?? profile?.email ?? "",
    monthlyFee: member.monthlyFee ?? profile?.monthlyFee,
    annualTarget: member.annualTarget ?? profile?.annualTarget,
    password: member.password ?? (profile ? hashPassword(DEFAULT_MEMBER_PASSWORD) : undefined),
    loginActive: member.loginActive ?? false,
    status: member.status ?? "active",
  });

  const supabase = getSupabase();
  if (!supabase) {
    const members = getLocalMembers();
    members.unshift(newMember);
    saveLocalMembers(members);
    dispatchStorage();
    return newMember;
  }

  const { error } = await supabase.from("members").insert(memberToRow(newMember));
  if (error) throw error;
  return newMember;
}

export async function updateMember(memberId: string, data: Partial<Member>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    const members = getLocalMembers().map((m) => (m.id === memberId ? normalizeMember({ ...m, ...data }) : m));
    saveLocalMembers(members);
    dispatchStorage();
    return;
  }

  const existing = (await supabase.from("members").select("*").eq("id", memberId).single()).data;
  if (!existing) return;
  const merged = normalizeMember({ ...rowToMember(existing), ...data });
  const row = memberToRow(merged);
  const { error } = await supabase.from("members").update(row).eq("id", memberId);
  if (error) throw error;
}

export async function deleteMember(memberId: string): Promise<void> {
  return archiveMemberToBin(memberId, "admin_removed");
}

export async function archiveMemberToBin(
  memberId: string,
  reason: "auto_removed" | "admin_removed"
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    const members = getLocalMembers();
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    if (member.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return;

    const memberPayments = getLocalPayments().filter((p) => p.memberId === memberId);
    const memberChats = getLocalChats().filter((c) => c.memberId === memberId);

    const record: ArchivedMemberRecord = {
      id: generateId(),
      member: { ...member, status: "removed", loginActive: false },
      payments: memberPayments,
      chats: memberChats,
      archivedAt: new Date().toISOString(),
      reason,
      totalPaid: memberPayments.reduce((sum, p) => sum + p.amount, 0),
    };

    const bin = getLocalBin();
    bin.unshift(record);
    saveLocalBin(bin);
    saveLocalMembers(members.filter((m) => m.id !== memberId));
    saveLocalPayments(getLocalPayments().filter((p) => p.memberId !== memberId));
    saveLocalChats(getLocalChats().filter((c) => c.memberId !== memberId));
    dispatchStorage();
    return;
  }

  const { data: memberRow, error: memberErr } = await supabase
    .from("members")
    .select("*")
    .eq("id", memberId)
    .maybeSingle();
  if (memberErr) throw memberErr;
  if (!memberRow) return;

  const member = normalizeMember(rowToMember(memberRow));
  if (member.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return;

  const { data: paymentRows, error: payErr } = await supabase
    .from("payments")
    .select("*")
    .eq("member_id", memberId);
  if (payErr) throw payErr;
  const memberPayments = (paymentRows ?? []).map((row) => rowToPayment(row));

  const { data: chatRows, error: chatErr } = await supabase
    .from("chats")
    .select("*")
    .eq("member_id", memberId);
  if (chatErr) throw chatErr;
  const memberChats = (chatRows ?? []).map((row) => rowToChat(row));

  const archiveId = generateId();
  const { error: binErr } = await supabase.from("bin").insert({
    id: archiveId,
    member,
    payments: memberPayments,
    chats: memberChats,
    archived_at: new Date().toISOString(),
    reason,
    total_paid: memberPayments.reduce((sum, p) => sum + p.amount, 0),
  });
  if (binErr) throw binErr;

  await supabase.from("members").delete().eq("id", memberId);
  if (memberPayments.length) {
    await supabase.from("payments").delete().in("id", memberPayments.map((p) => p.id));
    await removeSavingsForMember(memberId);
  }
  if (memberChats.length) {
    await supabase.from("chats").delete().in("id", memberChats.map((c) => c.id));
  }
}

export async function restoreMemberFromBin(archiveId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    const bin = getLocalBin();
    const record = bin.find((b) => b.id === archiveId);
    if (!record) return;

    const restored: Member = {
      ...record.member,
      status: "active",
      loginActive: false,
    };

    saveLocalMembers([restored, ...getLocalMembers()]);
    saveLocalPayments([...record.payments, ...getLocalPayments()]);
    saveLocalChats([...record.chats, ...getLocalChats()]);
    saveLocalBin(bin.filter((b) => b.id !== archiveId));
    dispatchStorage();
    return;
  }

  const { data: archiveRow, error: archiveErr } = await supabase
    .from("bin")
    .select("*")
    .eq("id", archiveId)
    .maybeSingle();
  if (archiveErr) throw archiveErr;
  if (!archiveRow) return;

  const data = rowToBin(archiveRow);
  const restored = { ...data.member, status: "active" as const, loginActive: false };

  await supabase.from("members").insert(memberToRow(restored));
  if (data.payments.length) {
    await supabase.from("payments").insert(data.payments.map((p) => paymentToRow(p)));
    await supabase.from("savings").insert(data.payments.map((p) => savingsToRow(paymentToSavings(p))));
  }
  if (data.chats.length) {
    await supabase.from("chats").insert(data.chats.map((c) => chatToRow(c)));
  }
  await supabase.from("bin").delete().eq("id", archiveId);
}

export function subscribeBin(callback: (records: ArchivedMemberRecord[]) => void): Unsubscribe {
  const supabase = getSupabase();
  if (!supabase) {
    callback(getLocalBin());
    const handler = () => callback(getLocalBin());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  const reload = () => {
    fetchAllBin()
      .then(callback)
      .catch((err) => {
        console.error("SUPABASE bin fetch error:", err);
        callback([]);
      });
  };
  return subscribeRealtime("bin", reload);
}

export async function archiveRemovedMembers(): Promise<void> {
  if (typeof window === "undefined") return;
  const members = getLocalMembers();
  for (const member of members) {
    if (member.status === "removed") {
      await archiveMemberToBin(member.id, "auto_removed");
    }
  }
}


export async function addPayment(payment: Omit<Payment, "id">): Promise<Payment> {
  const newPayment: Payment = { ...payment, id: generateId() };
  const supabase = getSupabase();
  if (!supabase) {
    const payments = getLocalPayments();
    payments.unshift(newPayment);
    saveLocalPayments(payments);
    dispatchStorage();
    return newPayment;
  }
  const { error } = await supabase.from("payments").insert(paymentToRow({ ...newPayment, note: newPayment.note ?? "" }));
  if (error) throw error;
  await upsertSavingsRecord(newPayment);
  return newPayment;
}

export async function deletePayment(paymentId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    saveLocalPayments(getLocalPayments().filter((p) => p.id !== paymentId));
    dispatchStorage();
    return;
  }
  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) throw error;
  await removeSavingsRecord(paymentId);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    saveLocalSettings(settings);
    dispatchStorage();
    return;
  }
  const { error } = await supabase.from("app_settings").upsert(settingsToRow(settings));
  if (error) throw error;
}

export async function addAnnouncement(message: string, durationHours: number): Promise<Announcement> {
  const item: Announcement = {
    id: generateId(),
    message,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
  };

  const supabase = getSupabase();
  if (!supabase) {
    const items = getLocalAnnouncements();
    items.unshift(item);
    saveLocalAnnouncements(items);
    dispatchStorage();
    return item;
  }

  const { error } = await supabase.from("announcements").insert(announcementToRow(item));
  if (error) throw error;
  return item;
}

export async function addChatMessage(memberId: string, message: string, fromAdmin: boolean): Promise<ChatMessage> {
  const item: ChatMessage = {
    id: generateId(),
    memberId,
    fromAdmin,
    message,
    sentAt: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (!supabase) {
    const chats = getLocalChats();
    chats.push(item);
    saveLocalChats(chats);
    dispatchStorage();
    return item;
  }

  const { error } = await supabase.from("chats").insert(chatToRow(item));
  if (error) throw error;
  return item;
}

export async function deleteChatMessage(chatId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    saveLocalChats(getLocalChats().filter((c) => c.id !== chatId));
    dispatchStorage();
    return;
  }
  const { error } = await supabase.from("chats").delete().eq("id", chatId);
  if (error) throw error;
}

export async function fetchSettings(): Promise<AppSettings> {
  const supabase = getSupabase();
  if (!supabase) return getLocalSettings();
  return fetchSettingsRow();
}

export function getDataMode(): "supabase" | "demo" {
  return isSupabaseConfigured() ? "supabase" : "demo";
}
