"use client";

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isFirebaseConfigured } from "./firestore-config";
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
  newMemberToFirestore,
} from "./firestore-mappers";
import {
  DEFAULT_SETTINGS,
  DEFAULT_MEMBER_PROFILES,
  DEFAULT_MEMBER_PASSWORD,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from "./constants";
import { hashPassword } from "./auth";
import { isAdminMember } from "./member-status";
import { createMemberFirebaseAuth, isValidMemberLoginId, loginIdToEmail, normalizeLoginId } from "./member-auth";
import { ensureAdminFirebaseSession } from "./admin-firebase-auth";
import { generateId } from "./utils";
import type { Member, Payment, AppSettings, Announcement, ChatMessage, ArchivedMemberRecord, Savings } from "@/types";

type Unsubscribe = () => void;

function requireFirestore(): void {
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore ma diyaar ahayn");
  }
}

/** Best-effort admin Firebase sign-in (needed when security rules require auth). */
async function ensureFirestoreWriteAccess(): Promise<void> {
  requireFirestore();
  await ensureAdminFirebaseSession();
}

function mapCollectionSnapshot<T>(
  snapshot: { docs: { id: string; data: () => Record<string, unknown> }[] },
  mapRow: (row: Record<string, unknown>) => T
): T[] {
  return snapshot.docs.map((snap) => mapRow({ id: snap.id, ...snap.data() }));
}

async function fetchAllMembers(): Promise<Member[]> {
  if (!isFirebaseConfigured()) return [];
  const snapshot = await getDocs(query(collection(db(), "members"), orderBy("created_at", "desc")));
  return snapshot.docs.map((snap) => normalizeMember(rowToMember({ id: snap.id, ...snap.data() })));
}

async function fetchAllPayments(): Promise<Payment[]> {
  if (!isFirebaseConfigured()) return [];
  const snapshot = await getDocs(query(collection(db(), "payments"), orderBy("paid_at", "desc")));
  return snapshot.docs.map((snap) => rowToPayment({ id: snap.id, ...snap.data() }));
}

async function fetchSettingsRow(): Promise<AppSettings> {
  if (!isFirebaseConfigured()) return DEFAULT_SETTINGS;
  const snapshot = await getDoc(doc(db(), "app_settings", "app"));
  return snapshot.exists() ? rowToSettings({ id: snapshot.id, ...snapshot.data() }) : DEFAULT_SETTINGS;
}

async function fetchAnnouncements(): Promise<Announcement[]> {
  if (!isFirebaseConfigured()) return [];
  const now = Date.now();
  const snapshot = await getDocs(query(collection(db(), "announcements"), orderBy("created_at", "desc")));
  return snapshot.docs
    .map((snap) => rowToAnnouncement({ id: snap.id, ...snap.data() }))
    .filter((a) => new Date(a.expiresAt).getTime() > now);
}

async function fetchAllChats(): Promise<ChatMessage[]> {
  if (!isFirebaseConfigured()) return [];
  const snapshot = await getDocs(query(collection(db(), "chats"), orderBy("sent_at", "asc")));
  return snapshot.docs.map((snap) => rowToChat({ id: snap.id, ...snap.data() }));
}

async function fetchAllSavings(): Promise<Savings[]> {
  if (!isFirebaseConfigured()) return [];
  const snapshot = await getDocs(query(collection(db(), "savings"), orderBy("paid_at", "desc")));
  return snapshot.docs.map((snap) => rowToSavings({ id: snap.id, ...snap.data() }));
}

async function syncSavingsFromPayments(): Promise<void> {
  if (!isFirebaseConfigured()) return;

  try {
    const countSnapshot = await getCountFromServer(collection(db(), "savings"));
    if (countSnapshot.data().count > 0) return;

    const payments = await fetchAllPayments();
    if (payments.length === 0) return;

    const batch = writeBatch(db());
    for (const payment of payments) {
      const savings = paymentToSavings(payment);
      batch.set(doc(db(), "savings", savings.id), savingsToRow(savings), { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.error("FIRESTORE savings sync failed:", err);
  }
}

async function upsertSavingsRecord(payment: Payment): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const savings = paymentToSavings(payment);
    await setDoc(doc(db(), "savings", savings.id), savingsToRow(savings), { merge: true });
  } catch (error) {
    console.error("FIRESTORE savings upsert error:", error);
  }
}

async function removeSavingsRecord(paymentId: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    await deleteDoc(doc(db(), "savings", paymentId));
  } catch (error) {
    console.error("FIRESTORE savings delete error:", error);
  }
}

function normalizeMember(raw: Partial<Member> & { id: string; name: string }): Member {
  const isAdmin =
    raw.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
    raw.name === "Maamulaha";

  return {
    id: raw.id,
    uid: raw.uid,
    name: raw.name,
    phone: raw.phone ?? "",
    email: raw.email ?? "",
    loginId: raw.loginId,
    paid: raw.paid,
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

async function ensureAdminMember(): Promise<void> {
  if (!isFirebaseConfigured()) return;

  try {
    const snapshot = await getDocs(collection(db(), "members"));
    const hasAdmin = snapshot.docs.some((snap) =>
      isAdminMember(rowToMember({ id: snap.id, ...snap.data() }))
    );
    if (hasAdmin) return;
  } catch (err) {
    console.error("FIRESTORE admin member check error:", err);
    return;
  }

  try {
    await addMember({
      name: "Maamulaha",
      email: ADMIN_EMAIL,
      joinDate: DEFAULT_SETTINGS.groupStartDate,
      monthlyFee: 0,
      annualTarget: 0,
      loginActive: true,
      status: "active",
      paid: false,
      password: hashPassword(ADMIN_PASSWORD),
    });
  } catch (err) {
    console.error("FIRESTORE admin member create error:", err);
  }
}

export async function seedDefaultMembers(): Promise<void> {
  if (typeof window === "undefined" || !isFirebaseConfigured()) return;

  await ensureAdminMember();

  try {
    await fetch("/api/setup/admin-auth", { method: "POST" });
  } catch {
    // best-effort — admin user may already exist in Firebase Auth
  }

  try {
    await syncSavingsFromPayments();
  } catch {
    // non-blocking
  }

  try {
    const countSnapshot = await getCountFromServer(collection(db(), "members"));
    if (countSnapshot.data().count > 0) return;
  } catch (err) {
    console.error("FIRESTORE members count error:", err);
    return;
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
      paid: false,
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
    paid: false,
    password: hashPassword(ADMIN_PASSWORD),
  });
}

export function subscribeMembers(callback: (members: Member[]) => void): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    collection(db(), "members"),
    (snapshot) => {
      const members = snapshot.docs
        .map((snap) => normalizeMember(rowToMember({ id: snap.id, ...snap.data() })))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(members);
    },
    (err) => {
      console.error("FIRESTORE members fetch error:", err);
      callback([]);
    }
  );
}

export function subscribePayments(callback: (payments: Payment[]) => void): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    query(collection(db(), "payments"), orderBy("paid_at", "desc")),
    (snapshot) => {
      callback(mapCollectionSnapshot(snapshot, rowToPayment));
    },
    (err) => {
      console.error("FIRESTORE payments fetch error:", err);
      callback([]);
    }
  );
}

export function subscribeSavings(callback: (items: Savings[]) => void): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    query(collection(db(), "savings"), orderBy("paid_at", "desc")),
    (snapshot) => {
      callback(mapCollectionSnapshot(snapshot, rowToSavings));
    },
    (err) => {
      console.error("FIRESTORE savings fetch error:", err);
      callback([]);
    }
  );
}

export function subscribeSettings(callback: (settings: AppSettings) => void): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback(DEFAULT_SETTINGS);
    return () => undefined;
  }

  return onSnapshot(
    doc(db(), "app_settings", "app"),
    (snapshot) => {
      callback(
        snapshot.exists()
          ? rowToSettings({ id: snapshot.id, ...snapshot.data() })
          : DEFAULT_SETTINGS
      );
    },
    (err) => {
      console.error("FIRESTORE settings fetch error:", err);
      callback(DEFAULT_SETTINGS);
    }
  );
}

export function subscribeAnnouncements(callback: (items: Announcement[]) => void): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    query(collection(db(), "announcements"), orderBy("created_at", "desc")),
    (snapshot) => {
      const now = Date.now();
      callback(
        mapCollectionSnapshot(snapshot, rowToAnnouncement).filter(
          (a) => new Date(a.expiresAt).getTime() > now
        )
      );
    },
    (err) => {
      console.error("FIRESTORE announcements fetch error:", err);
      callback([]);
    }
  );
}

export function subscribeChats(callback: (messages: ChatMessage[]) => void): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    query(collection(db(), "chats"), orderBy("sent_at", "asc")),
    (snapshot) => {
      callback(mapCollectionSnapshot(snapshot, rowToChat));
    },
    (err) => {
      console.error("FIRESTORE chats fetch error:", err);
      callback([]);
    }
  );
}

export interface AddMemberWithAuthInput {
  name: string;
  loginId: string;
  password: string;
  contribution: number;
}

export async function addMemberWithAuth(input: AddMemberWithAuthInput): Promise<Member> {
  const name = input.name.trim();
  const loginId = normalizeLoginId(input.loginId);
  const password = input.password;
  const contribution = input.contribution;

  if (!name) throw new Error("Magaca xubinta waa lagama maarmaan");
  if (!isValidMemberLoginId(loginId)) throw new Error("Login ID aan sax ahayn");
  if (!password || password.length < 6) throw new Error("Password waa inuu ugu yaraan 6 xaraf yahay");
  if (!Number.isFinite(contribution) || contribution <= 0) throw new Error("Lacagta bishii waa inay ka weyn tahay 0");

  await ensureFirestoreWriteAccess();

  const existing = await fetchAllMembers();
  if (isLoginIdTakenLocal(existing, loginId)) throw new Error("Login ID-kan horey ayaa loo isticmaalay");

  const uid = await createMemberFirebaseAuth(loginId, password);
  const createdAt = new Date().toISOString();
  const settings = await fetchSettingsRow();
  const joinDate = settings.groupStartDate || DEFAULT_SETTINGS.groupStartDate;

  const firestoreRow = newMemberToFirestore({
    name,
    loginId,
    contribution,
    uid,
    joinDate,
    createdAt,
  });

  await setDoc(doc(db(), "members", uid), firestoreRow);

  return normalizeMember({
    id: uid,
    uid,
    name,
    loginId,
    email: loginIdToEmail(loginId),
    joinDate,
    monthlyFee: contribution,
    annualTarget: contribution * 12,
    loginActive: true,
    status: "active",
    paid: false,
    createdAt,
  });
}

function isLoginIdTakenLocal(members: Member[], loginId: string): boolean {
  const local = normalizeLoginId(loginId).toLowerCase();
  return members.some((m) => (m.loginId ?? normalizeLoginId(m.email ?? "")).toLowerCase() === local);
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
    paid: member.paid ?? false,
  });

  if (!isFirebaseConfigured()) {
    throw new Error("Firestore ma diyaar ahayn");
  }

  await setDoc(doc(db(), "members", newMember.id), memberToRow(newMember));
  return newMember;
}

export async function updateMember(memberId: string, data: Partial<Member>): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore ma diyaar ahayn");
  }

  const memberRef = doc(db(), "members", memberId);
  const existingSnapshot = await getDoc(memberRef);
  if (!existingSnapshot.exists()) return;
  const merged = normalizeMember({ ...rowToMember({ id: existingSnapshot.id, ...existingSnapshot.data() }), ...data });
  const row = memberToRow(merged);
  await updateDoc(memberRef, row);
}

export async function deleteMember(memberId: string): Promise<void> {
  return archiveMemberToBin(memberId, "admin_removed");
}

export async function archiveMemberToBin(
  memberId: string,
  reason: "auto_removed" | "admin_removed"
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore ma diyaar ahayn");
  }

  const memberRef = doc(db(), "members", memberId);
  const memberSnapshot = await getDoc(memberRef);
  if (!memberSnapshot.exists()) return;

  const member = normalizeMember(rowToMember({ id: memberSnapshot.id, ...memberSnapshot.data() }));
  if (member.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return;

  const paymentsSnapshot = await getDocs(collection(db(), "payments"));
  const memberPayments = paymentsSnapshot.docs
    .map((snap) => rowToPayment({ id: snap.id, ...snap.data() }))
    .filter((p) => p.memberId === memberId);

  const chatsSnapshot = await getDocs(collection(db(), "chats"));
  const memberChats = chatsSnapshot.docs
    .map((snap) => rowToChat({ id: snap.id, ...snap.data() }))
    .filter((c) => c.memberId === memberId);

  const archiveId = generateId();
  await setDoc(doc(db(), "bin", archiveId), {
    id: archiveId,
    member,
    payments: memberPayments,
    chats: memberChats,
    archived_at: new Date().toISOString(),
    reason,
    total_paid: memberPayments.reduce((sum, p) => sum + p.amount, 0),
  });

  const batch = writeBatch(db());
  batch.delete(memberRef);
  memberPayments.forEach((payment) => {
    batch.delete(doc(db(), "payments", payment.id));
  });
  memberChats.forEach((chat) => {
    batch.delete(doc(db(), "chats", chat.id));
  });

  const savingsSnapshot = await getDocs(collection(db(), "savings"));
  savingsSnapshot.docs.forEach((snap) => {
    const row = { id: snap.id, ...snap.data() } as Record<string, unknown>;
    if (row.member_id === memberId) {
      batch.delete(doc(db(), "savings", snap.id));
    }
  });
  await batch.commit();
}

export async function restoreMemberFromBin(archiveId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore ma diyaar ahayn");
  }

  const archiveRef = doc(db(), "bin", archiveId);
  const archiveSnapshot = await getDoc(archiveRef);
  if (!archiveSnapshot.exists()) return;

  const data = rowToBin({ id: archiveSnapshot.id, ...archiveSnapshot.data() });
  const restored = { ...data.member, status: "active" as const, loginActive: false };

  await setDoc(doc(db(), "members", restored.id), memberToRow(restored));
  if (data.payments.length) {
    const batch = writeBatch(db());
    for (const payment of data.payments) {
      batch.set(doc(db(), "payments", payment.id), paymentToRow(payment));
      const savings = paymentToSavings(payment);
      batch.set(doc(db(), "savings", savings.id), savingsToRow(savings), { merge: true });
    }
    await batch.commit();
  }
  if (data.chats.length) {
    const batch = writeBatch(db());
    for (const chat of data.chats) {
      batch.set(doc(db(), "chats", chat.id), chatToRow(chat));
    }
    await batch.commit();
  }
  await deleteDoc(archiveRef);
}

export function subscribeBin(callback: (records: ArchivedMemberRecord[]) => void): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    query(collection(db(), "bin"), orderBy("archived_at", "desc")),
    (snapshot) => {
      callback(mapCollectionSnapshot(snapshot, rowToBin));
    },
    (err) => {
      console.error("FIRESTORE bin fetch error:", err);
      callback([]);
    }
  );
}

export async function archiveRemovedMembers(): Promise<void> {
  if (typeof window === "undefined" || !isFirebaseConfigured()) return;
  const members = await fetchAllMembers();
  for (const member of members) {
    if (member.status === "removed") {
      await archiveMemberToBin(member.id, "auto_removed");
    }
  }
}

export async function setMemberPaid(memberId: string, paid: boolean): Promise<void> {
  await ensureFirestoreWriteAccess();
  await updateDoc(doc(db(), "members", memberId), { paid });
}

export async function addPayment(payment: Omit<Payment, "id">): Promise<Payment> {
  const newPayment: Payment = { ...payment, id: generateId() };
  await ensureFirestoreWriteAccess();

  await setDoc(doc(db(), "payments", newPayment.id), paymentToRow({ ...newPayment, note: newPayment.note ?? "" }));
  await updateDoc(doc(db(), "members", payment.memberId), { paid: true });
  await upsertSavingsRecord(newPayment);
  return newPayment;
}

export async function deletePayment(paymentId: string): Promise<void> {
  await ensureFirestoreWriteAccess();

  const paymentRef = doc(db(), "payments", paymentId);
  const paymentSnapshot = await getDoc(paymentRef);
  const memberId = paymentSnapshot.exists()
    ? (paymentSnapshot.data().member_id as string)
    : undefined;

  await deleteDoc(paymentRef);
  await removeSavingsRecord(paymentId);

  if (memberId) {
    await updateDoc(doc(db(), "members", memberId), { paid: false });
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore ma diyaar ahayn");
  }
  await setDoc(doc(db(), "app_settings", "app"), settingsToRow(settings), { merge: true });
}

export async function addAnnouncement(message: string, durationHours: number): Promise<Announcement> {
  const item: Announcement = {
    id: generateId(),
    message,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
  };

  if (!isFirebaseConfigured()) {
    throw new Error("Firestore ma diyaar ahayn");
  }

  await setDoc(doc(db(), "announcements", item.id), announcementToRow(item));
  return item;
}

export async function addChatMessage(
  memberId: string,
  message: string,
  fromAdmin: boolean,
  senderName?: string
): Promise<ChatMessage> {
  const item: ChatMessage = {
    id: generateId(),
    memberId,
    fromAdmin,
    message,
    sentAt: new Date().toISOString(),
    senderName,
  };

  if (!isFirebaseConfigured()) {
    throw new Error("Firestore ma diyaar ahayn");
  }

  await setDoc(doc(db(), "chats", item.id), chatToRow(item));
  return item;
}

export async function deleteChatMessage(chatId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore ma diyaar ahayn");
  }
  await deleteDoc(doc(db(), "chats", chatId));
}

export async function fetchSettings(): Promise<AppSettings> {
  if (!isFirebaseConfigured()) return DEFAULT_SETTINGS;
  return fetchSettingsRow();
}

export function getDataMode(): "firebase" | "demo" {
  return isFirebaseConfigured() ? "firebase" : "demo";
}
