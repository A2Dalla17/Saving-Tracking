"use client";

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import {
  COLLECTIONS,
  DEFAULT_SETTINGS,
  DEFAULT_MEMBER_PROFILES,
  DEFAULT_MEMBER_PASSWORD,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from "./constants";
import { hashPassword } from "./auth";
import { generateId } from "./utils";
import type { Member, Payment, AppSettings, Announcement, ChatMessage, ArchivedMemberRecord } from "@/types";

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
  if (typeof window === "undefined" || !isFirebaseConfigured()) return;

  try {
    await fetch("/api/setup/seed", { method: "POST" });
  } catch {
    // seed is best-effort before login
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
    // migration can retry on next visit while firestore is still empty
  }
}

export async function seedDefaultMembers(): Promise<void> {
  if (typeof window === "undefined") return;

  if (isFirebaseConfigured()) {
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

  const db = getDb();
  if (db) {
    const snapshot = await getDocs(collection(db, COLLECTIONS.MEMBERS));
    if (!snapshot.empty) {
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
  const db = getDb();
  if (!db) {
    callback(getLocalMembers());
    const handler = () => callback(getLocalMembers());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  return onSnapshot(
    query(collection(db, COLLECTIONS.MEMBERS), orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(snapshot.docs.map((d) => normalizeMember({ id: d.id, ...d.data() } as Member)));
    }
  );
}

export function subscribePayments(callback: (payments: Payment[]) => void): Unsubscribe {
  const db = getDb();
  if (!db) {
    callback(getLocalPayments());
    const handler = () => callback(getLocalPayments());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  return onSnapshot(
    query(collection(db, COLLECTIONS.PAYMENTS), orderBy("paidAt", "desc")),
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)));
    }
  );
}

export function subscribeSettings(callback: (settings: AppSettings) => void): Unsubscribe {
  const db = getDb();
  if (!db) {
    callback(getLocalSettings());
    const handler = () => callback(getLocalSettings());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  const settingsRef = doc(db, COLLECTIONS.SETTINGS, "app");
  return onSnapshot(settingsRef, (snapshot) => {
    callback(snapshot.exists() ? { ...DEFAULT_SETTINGS, ...snapshot.data() } as AppSettings : DEFAULT_SETTINGS);
  });
}

export function subscribeAnnouncements(callback: (items: Announcement[]) => void): Unsubscribe {
  const db = getDb();
  if (!db) {
    const load = () => {
      const now = Date.now();
      callback(getLocalAnnouncements().filter((a) => new Date(a.expiresAt).getTime() > now));
    };
    load();
    const handler = () => load();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  return onSnapshot(
    query(collection(db, COLLECTIONS.ANNOUNCEMENTS), orderBy("createdAt", "desc")),
    (snapshot) => {
      const now = Date.now();
      callback(
        snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as Announcement))
          .filter((a) => new Date(a.expiresAt).getTime() > now)
      );
    }
  );
}

export function subscribeChats(callback: (messages: ChatMessage[]) => void): Unsubscribe {
  const db = getDb();
  if (!db) {
    callback(getLocalChats());
    const handler = () => callback(getLocalChats());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  return onSnapshot(
    query(collection(db, COLLECTIONS.CHATS), orderBy("sentAt", "asc")),
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
    }
  );
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

  const db = getDb();
  if (!db) {
    const members = getLocalMembers();
    members.unshift(newMember);
    saveLocalMembers(members);
    dispatchStorage();
    return newMember;
  }

  const docRef = await addDoc(collection(db, COLLECTIONS.MEMBERS), newMember);
  return { ...newMember, id: docRef.id };
}

export async function updateMember(memberId: string, data: Partial<Member>): Promise<void> {
  const db = getDb();
  if (!db) {
    const members = getLocalMembers().map((m) => (m.id === memberId ? normalizeMember({ ...m, ...data }) : m));
    saveLocalMembers(members);
    dispatchStorage();
    return;
  }
  await updateDoc(doc(db, COLLECTIONS.MEMBERS, memberId), data);
}

export async function deleteMember(memberId: string): Promise<void> {
  return archiveMemberToBin(memberId, "admin_removed");
}

export async function archiveMemberToBin(
  memberId: string,
  reason: "auto_removed" | "admin_removed"
): Promise<void> {
  const db = getDb();
  if (!db) {
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

  // Firebase: archive as document in bin collection, then delete from active
  const memberDoc = await getDoc(doc(db, COLLECTIONS.MEMBERS, memberId));
  if (!memberDoc.exists()) return;
  const member = normalizeMember({ id: memberDoc.id, ...memberDoc.data() } as Member);
  if (member.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return;

  const paymentsSnap = await getDocs(collection(db, COLLECTIONS.PAYMENTS));
  const memberPayments = paymentsSnap.docs
    .filter((d) => d.data().memberId === memberId)
    .map((d) => ({ id: d.id, ...d.data() } as Payment));

  const chatsSnap = await getDocs(collection(db, COLLECTIONS.CHATS));
  const memberChats = chatsSnap.docs
    .filter((d) => d.data().memberId === memberId)
    .map((d) => ({ id: d.id, ...d.data() } as ChatMessage));

  await addDoc(collection(db, COLLECTIONS.BIN), {
    member,
    payments: memberPayments,
    chats: memberChats,
    archivedAt: new Date().toISOString(),
    reason,
    totalPaid: memberPayments.reduce((sum, p) => sum + p.amount, 0),
  });

  await deleteDoc(doc(db, COLLECTIONS.MEMBERS, memberId));
  for (const p of memberPayments) {
    await deleteDoc(doc(db, COLLECTIONS.PAYMENTS, p.id));
  }
  for (const c of memberChats) {
    await deleteDoc(doc(db, COLLECTIONS.CHATS, c.id));
  }
}

export async function restoreMemberFromBin(archiveId: string): Promise<void> {
  const db = getDb();
  if (!db) {
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

  const archiveDoc = await getDoc(doc(db, COLLECTIONS.BIN, archiveId));
  if (!archiveDoc.exists()) return;
  const data = archiveDoc.data() as Omit<ArchivedMemberRecord, "id">;

  const restored = { ...data.member, status: "active" as const, loginActive: false };
  await addDoc(collection(db, COLLECTIONS.MEMBERS), restored);

  for (const p of data.payments) {
    await addDoc(collection(db, COLLECTIONS.PAYMENTS), p);
  }
  for (const c of data.chats) {
    await addDoc(collection(db, COLLECTIONS.CHATS), c);
  }
  await deleteDoc(doc(db, COLLECTIONS.BIN, archiveId));
}

export function subscribeBin(callback: (records: ArchivedMemberRecord[]) => void): Unsubscribe {
  const db = getDb();
  if (!db) {
    callback(getLocalBin());
    const handler = () => callback(getLocalBin());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  return onSnapshot(
    query(collection(db, COLLECTIONS.BIN), orderBy("archivedAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as ArchivedMemberRecord))
      );
    }
  );
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
  const db = getDb();
  if (!db) {
    const payments = getLocalPayments();
    payments.unshift(newPayment);
    saveLocalPayments(payments);
    dispatchStorage();
    return newPayment;
  }
  const docRef = await addDoc(collection(db, COLLECTIONS.PAYMENTS), { ...newPayment, note: newPayment.note ?? "" });
  return { ...newPayment, id: docRef.id };
}

export async function deletePayment(paymentId: string): Promise<void> {
  const db = getDb();
  if (!db) {
    saveLocalPayments(getLocalPayments().filter((p) => p.id !== paymentId));
    dispatchStorage();
    return;
  }
  await deleteDoc(doc(db, COLLECTIONS.PAYMENTS, paymentId));
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = getDb();
  if (!db) {
    saveLocalSettings(settings);
    dispatchStorage();
    return;
  }
  await setDoc(doc(db, COLLECTIONS.SETTINGS, "app"), settings, { merge: true });
}

export async function addAnnouncement(message: string, durationHours: number): Promise<Announcement> {
  const item: Announcement = {
    id: generateId(),
    message,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
  };

  const db = getDb();
  if (!db) {
    const items = getLocalAnnouncements();
    items.unshift(item);
    saveLocalAnnouncements(items);
    dispatchStorage();
    return item;
  }

  const docRef = await addDoc(collection(db, COLLECTIONS.ANNOUNCEMENTS), item);
  return { ...item, id: docRef.id };
}

export async function addChatMessage(memberId: string, message: string, fromAdmin: boolean): Promise<ChatMessage> {
  const item: ChatMessage = {
    id: generateId(),
    memberId,
    fromAdmin,
    message,
    sentAt: new Date().toISOString(),
  };

  const db = getDb();
  if (!db) {
    const chats = getLocalChats();
    chats.push(item);
    saveLocalChats(chats);
    dispatchStorage();
    return item;
  }

  const docRef = await addDoc(collection(db, COLLECTIONS.CHATS), item);
  return { ...item, id: docRef.id };
}

export async function deleteChatMessage(chatId: string): Promise<void> {
  const db = getDb();
  if (!db) {
    saveLocalChats(getLocalChats().filter((c) => c.id !== chatId));
    dispatchStorage();
    return;
  }
  await deleteDoc(doc(db, COLLECTIONS.CHATS, chatId));
}

export async function fetchSettings(): Promise<AppSettings> {
  const db = getDb();
  if (!db) return getLocalSettings();
  const snapshot = await getDoc(doc(db, COLLECTIONS.SETTINGS, "app"));
  return snapshot.exists() ? { ...DEFAULT_SETTINGS, ...snapshot.data() } as AppSettings : DEFAULT_SETTINGS;
}

export function getDataMode(): "firebase" | "demo" {
  return isFirebaseConfigured() ? "firebase" : "demo";
}
