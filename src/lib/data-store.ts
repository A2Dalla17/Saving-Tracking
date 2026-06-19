"use client";

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  waitForPendingWrites,
} from "firebase/firestore";
import { db, ensureFirestoreOnline, getClientAuth } from "@/lib/firebase";
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
import { isCurrentMonthPaid, paymentBelongsToMember, findCurrentMonthPayment, getCurrentMonthKey, formatMonthKey } from "./calculations";
import { isValidMemberLoginId, loginIdToEmail, normalizeLoginId } from "./member-auth";
import { ensureAdminFirebaseSession } from "./admin-firebase-auth";
import { generateId } from "./utils";
import type { Member, Payment, AppSettings, Announcement, ChatMessage, ArchivedMemberRecord, Savings } from "@/types";

type Unsubscribe = () => void;

function requireFirestore(): void {
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore ma diyaar ahayn");
  }
}

/** Require Firebase Auth before client Firestore writes (rules: request.auth != null). */
async function ensureFirestoreWriteAccess(): Promise<void> {
  requireFirestore();
  await ensureFirestoreOnline();

  if (getClientAuth().currentUser) {
    return;
  }

  const result = await ensureAdminFirebaseSession();
  if (!result.success) {
    const message = result.error ?? "Fadlan soo gal Firebase Auth";
    console.error("Firestore write blocked — not authenticated:", message);
    throw new Error(`Firebase Auth loo baahan yahay Firestore: ${message}`);
  }
}

async function collectionHasDocuments(collectionName: string): Promise<boolean> {
  await ensureFirestoreOnline();
  const snapshot = await getDocs(query(collection(db(), collectionName), limit(1)));
  return !snapshot.empty;
}

async function firestoreAddMember(data: Record<string, unknown>): Promise<string> {
  console.log("Writing to Firestore", data);
  try {
    await ensureFirestoreWriteAccess();
    const ref = await addDoc(collection(db(), "members"), data);
    console.log("Firestore success", ref.id);
    return ref.id;
  } catch (err) {
    console.error("Firestore FAILED", err);
    throw err;
  }
}

async function firestoreSetMemberByUid(uid: string, data: Record<string, unknown>): Promise<string> {
  console.log("Writing to Firestore", { id: uid, ...data });
  try {
    await ensureFirestoreWriteAccess();
    const memberRef = doc(db(), "members", uid);
    await setDoc(memberRef, data, { merge: true });
    await waitForPendingWrites(db());
    const verify = await getDoc(memberRef);
    if (!verify.exists()) {
      throw new Error("Firestore kaydin wuu fashilmay — xubin lama kaydin");
    }
    console.log("Firestore success", uid);
    return uid;
  } catch (err) {
    console.error("Firestore FAILED", err);
    throw err instanceof Error ? err : new Error("Firestore kaydin wuu fashilmay");
  }
}

async function createMemberViaServerApi(input: {
  name: string;
  loginId: string;
  password: string;
  contribution: number;
}): Promise<{ id: string; uid: string }> {
  const res = await fetch("/api/members/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    success?: boolean;
    id?: string;
    uid?: string;
    error?: string;
    stage?: string;
  };

  if (!res.ok) {
    const message = data.error ?? `Server error ${res.status}`;
    console.error("Server member create FAILED:", { status: res.status, stage: data.stage, message });
    throw new Error(message);
  }

  if (!data.uid && !data.id) {
    console.error("Server member create FAILED: no uid in response", data);
    throw new Error(data.error ?? "Server API ma soo celin uid");
  }

  const uid = data.uid ?? data.id!;
  console.log("Server created Auth + Firestore member:", uid);
  return { id: uid, uid };
}

/** Load all members via Admin SDK API (works when client Firestore read is blocked). */
export async function fetchMembersFromServerApi(): Promise<Member[]> {
  const res = await fetch("/api/members/list", { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    members?: Array<Partial<Member> & { id: string; name: string }>;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error ?? `Server error ${res.status}`);
  }

  const rows = data.members ?? [];
  return rows
    .map((row) => normalizeMember(rowToMember(row as Record<string, unknown>)))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function resolveMembersForPayment(): Promise<Member[]> {
  const client = await fetchAllMembers();
  if (client.length > 0) return client;
  try {
    return await fetchMembersFromServerApi();
  } catch {
    return client;
  }
}

async function firestoreUpdateMemberDoc(
  memberId: string,
  data: Record<string, unknown>
): Promise<void> {
  console.log("Writing to Firestore", { id: memberId, ...data });
  try {
    await ensureFirestoreWriteAccess();
    await updateDoc(doc(db(), "members", memberId), data);
    console.log("Firestore success", memberId);
  } catch (err) {
    console.error("Firestore FAILED", err);
    throw err;
  }
}

function mapCollectionSnapshot<T>(
  snapshot: { docs: { id: string; data: () => Record<string, unknown> }[] },
  mapRow: (row: Record<string, unknown>) => T
): T[] {
  return snapshot.docs.map((snap) => mapRow({ ...snap.data(), id: snap.id }));
}

async function fetchAllMembers(): Promise<Member[]> {
  if (!isFirebaseConfigured()) return [];
  await ensureFirestoreOnline();
  const snapshot = await getDocs(collection(db(), "members"));
  return snapshot.docs
    .map((snap) => normalizeMember(rowToMember({ id: snap.id, ...snap.data() })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function fetchAllPayments(): Promise<Payment[]> {
  if (!isFirebaseConfigured()) return [];
  const snapshot = await getDocs(query(collection(db(), "payments"), orderBy("paid_at", "desc")));
  return snapshot.docs.map((snap) => rowToPayment({ ...snap.data(), id: snap.id }));
}

async function fetchSettingsRow(): Promise<AppSettings> {
  if (!isFirebaseConfigured()) return DEFAULT_SETTINGS;
  try {
    await ensureFirestoreOnline();
    const snapshot = await getDoc(doc(db(), "app_settings", "app"));
    return snapshot.exists() ? rowToSettings({ id: snapshot.id, ...snapshot.data() }) : DEFAULT_SETTINGS;
  } catch (err) {
    console.warn("fetchSettingsRow fallback to defaults:", err);
    return DEFAULT_SETTINGS;
  }
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
    await ensureFirestoreOnline();
    const hasSavings = await collectionHasDocuments("savings");
    if (hasSavings) return;

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

  try {
    const res = await fetch("/api/setup/seed", { method: "POST" });
    if (res.ok) {
      const result = (await res.json()) as { seeded?: boolean; reason?: string };
      console.log("Server Firestore seed:", result);
      if (result.seeded) return;
    }
  } catch (err) {
    console.warn("Server seed unavailable, using client Firestore writes:", err);
  }

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
    const hasMembers = await collectionHasDocuments("members");
    if (hasMembers) return;
  } catch (err) {
    console.error("FIRESTORE members count error:", err);
    return;
  }

  // Only ensure admin exists when DB is empty — no hardcoded member list on client.
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

function safeFirestoreSubscribe(
  label: string,
  setup: () => Unsubscribe,
  onFail: () => void
): Unsubscribe {
  try {
    return setup();
  } catch (err) {
    console.error(`FIRESTORE ${label} subscribe setup error:`, err);
    onFail();
    return () => undefined;
  }
}

export function subscribeMembers(callback: (members: Member[]) => void): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => undefined;
  }

  void ensureFirestoreOnline();
  return safeFirestoreSubscribe(
    "members",
    () =>
      onSnapshot(
        collection(db(), "members"),
        (snapshot) => {
          console.log("Firestore members snapshot:", snapshot.docs.length, "documents");
          const members = snapshot.docs
            .map((snap) => normalizeMember(rowToMember({ id: snap.id, ...snap.data() })))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          callback(members);
        },
        (err) => {
          const code = (err as { code?: string })?.code;
          console.error("FIRESTORE members fetch error:", err);
          if (code === "permission-denied") {
            console.error(
              "Firestore RULES blocked read. Update Firebase Console → Firestore → Rules to: allow read, write: if request.auth != null"
            );
          }
          callback([]);
        }
      ),
    () => callback([])
  );
}

export function subscribePayments(callback: (payments: Payment[]) => void): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => undefined;
  }

  return safeFirestoreSubscribe(
    "payments",
    () =>
      onSnapshot(
        collection(db(), "payments"),
        (snapshot) => {
          const payments = mapCollectionSnapshot(snapshot, rowToPayment).sort(
            (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
          );
          callback(payments);
        },
        (err) => {
          console.error("FIRESTORE payments fetch error:", err);
          callback([]);
        }
      ),
    () => callback([])
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

  return safeFirestoreSubscribe(
    "settings",
    () =>
      onSnapshot(
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
      ),
    () => callback(DEFAULT_SETTINGS)
  );
}

export function subscribeAnnouncements(callback: (items: Announcement[]) => void): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    collection(db(), "announcements"),
    (snapshot) => {
      const now = Date.now();
      callback(
        mapCollectionSnapshot(snapshot, rowToAnnouncement)
          .filter((a) => new Date(a.expiresAt).getTime() > now)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
    collection(db(), "chats"),
    (snapshot) => {
      callback(
        mapCollectionSnapshot(snapshot, rowToChat).sort(
          (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        )
      );
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

  let existing: Member[] = [];
  try {
    existing = await fetchMembersFromServerApi();
  } catch {
    existing = await fetchAllMembers();
  }
  if (isLoginIdTakenLocal(existing, loginId)) throw new Error("Login ID-kan horey ayaa loo isticmaalay");

  const createdAt = new Date().toISOString();
  const settings = await fetchSettingsRow();
  const joinDate = settings.groupStartDate || DEFAULT_SETTINGS.groupStartDate;

  // Server API: Firebase Auth user + Firestore members/{uid} (Admin SDK)
  const serverResult = await createMemberViaServerApi({ name, loginId, password, contribution });
  const uid = serverResult.uid;

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
  const createdAt = new Date().toISOString();
  const loginId =
    member.loginId ??
    (member.email ? normalizeLoginId(member.email) : undefined);
  const contribution = member.monthlyFee ?? profile?.monthlyFee ?? DEFAULT_SETTINGS.monthlyFee;

  if (!isFirebaseConfigured()) {
    throw new Error("Firestore ma diyaar ahayn");
  }

  const firestoreRow = {
    name: member.name,
    loginId: loginId ?? "",
    contributionAmount: contribution,
    paid: member.paid ?? false,
    createdAt,
    uid: member.uid ?? null,
    email: member.email ?? profile?.email ?? "",
    phone: member.phone ?? "",
    password: member.password ?? (profile ? hashPassword(DEFAULT_MEMBER_PASSWORD) : null),
    join_date: member.joinDate ?? DEFAULT_SETTINGS.groupStartDate,
    end_date: member.endDate ?? null,
    monthly_fee: contribution,
    annual_target: member.annualTarget ?? profile?.annualTarget ?? contribution * 12,
    login_active: member.loginActive ?? false,
    status: member.status ?? "active",
    avatar_url: member.avatarUrl ?? null,
  };

  const memberId = await firestoreAddMember(firestoreRow);

  return normalizeMember({
    ...member,
    id: memberId,
    createdAt,
    email: member.email ?? profile?.email ?? "",
    loginId,
    monthlyFee: contribution,
    annualTarget: member.annualTarget ?? profile?.annualTarget ?? contribution * 12,
    password: member.password ?? (profile ? hashPassword(DEFAULT_MEMBER_PASSWORD) : undefined),
    loginActive: member.loginActive ?? false,
    status: member.status ?? "active",
    paid: member.paid ?? false,
  });
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
  await firestoreUpdateMemberDoc(memberId, row);
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

  await ensureFirestoreWriteAccess();

  const memberRef = doc(db(), "members", memberId);
  const memberSnapshot = await getDoc(memberRef);
  if (!memberSnapshot.exists()) {
    throw new Error("Xubinta lama helin");
  }

  const member = normalizeMember(rowToMember({ id: memberSnapshot.id, ...memberSnapshot.data() }));
  if (member.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    throw new Error("Maamulaha lama tirtiri karo");
  }

  const archivedMember: Member = {
    ...member,
    loginActive: false,
    status: "removed",
  };

  const paymentsSnapshot = await getDocs(collection(db(), "payments"));
  const memberPayments = paymentsSnapshot.docs
    .map((snap) => rowToPayment({ id: snap.id, ...snap.data() }))
    .filter((p) => paymentBelongsToMember(p, member));

  const chatsSnapshot = await getDocs(collection(db(), "chats"));
  const memberChats = chatsSnapshot.docs
    .map((snap) => rowToChat({ id: snap.id, ...snap.data() }))
    .filter((c) => c.memberId === memberId || c.memberId === member.uid);

  const archiveId = generateId();
  await setDoc(doc(db(), "bin", archiveId), {
    id: archiveId,
    member: archivedMember,
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
    const savingsMemberId = row.member_id as string;
    if (
      savingsMemberId === memberId ||
      savingsMemberId === member.uid ||
      memberPayments.some((p) => p.id === snap.id)
    ) {
      batch.delete(doc(db(), "savings", snap.id));
    }
  });
  await batch.commit();

  if (member.uid) {
    try {
      await fetch("/api/members/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: member.uid, email: member.email }),
      });
    } catch (err) {
      console.warn("Auth user delete skipped:", err);
    }
  }
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
    collection(db(), "bin"),
    (snapshot) => {
      callback(
        mapCollectionSnapshot(snapshot, rowToBin).sort(
          (a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
        )
      );
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
  await firestoreUpdateMemberDoc(memberId, { paid });
}

export async function addPayment(payment: Omit<Payment, "id">): Promise<Payment> {
  const newPayment: Payment = { ...payment, id: generateId() };
  const paymentRow = paymentToRow({ ...newPayment, note: newPayment.note ?? "" });

  console.log("Writing to Firestore", paymentRow);
  try {
    await ensureFirestoreWriteAccess();
    await setDoc(doc(db(), "payments", newPayment.id), paymentRow);
    console.log("Firestore success", newPayment.id);

    const members = await resolveMembersForPayment();
    const member = members.find(
      (m) => m.id === payment.memberId || m.uid === payment.memberId
    );
    if (member) {
      const updates: Record<string, unknown> = { paid: true };
      if (member.status === "warning") updates.status = "active";
      await firestoreUpdateMemberDoc(member.id, updates);
    } else {
      await firestoreUpdateMemberDoc(payment.memberId, { paid: true });
    }

    await upsertSavingsRecord(newPayment);
    return newPayment;
  } catch (err) {
    console.error("Firestore FAILED", err);
    throw err;
  }
}

export async function deletePayment(paymentId: string, memberHint?: Member): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore ma diyaar ahayn");
  }

  await ensureFirestoreWriteAccess();

  let resolvedDocId = paymentId;
  let memberId: string | undefined;

  const tryRef = doc(db(), "payments", resolvedDocId);
  const trySnap = await getDoc(tryRef);

  if (trySnap.exists()) {
    memberId = trySnap.data().member_id as string | undefined;
  } else if (memberHint) {
    const snapshot = await getDocs(collection(db(), "payments"));
    const monthKey = getCurrentMonthKey();
    const match = snapshot.docs.find((snap) => {
      const payment = rowToPayment({ ...snap.data(), id: snap.id });
      return (
        paymentBelongsToMember(payment, memberHint) &&
        formatMonthKey(payment.year, payment.month) === monthKey
      );
    });
    if (match) {
      resolvedDocId = match.id;
      memberId = match.data().member_id as string | undefined;
    } else {
      const cached = findCurrentMonthPayment(await fetchAllPayments(), memberHint);
      if (cached) {
        const cachedRef = doc(db(), "payments", cached.id);
        const cachedSnap = await getDoc(cachedRef);
        if (cachedSnap.exists()) {
          resolvedDocId = cached.id;
          memberId = cachedSnap.data().member_id as string | undefined;
        }
      }
    }
  }

  const paymentRef = doc(db(), "payments", resolvedDocId);
  const paymentSnapshot = await getDoc(paymentRef);
  if (!paymentSnapshot.exists()) {
    throw new Error("Lacag bixinta lama helin");
  }

  memberId = memberId ?? (paymentSnapshot.data().member_id as string | undefined);

  console.log("Writing to Firestore", { action: "deletePayment", paymentId: resolvedDocId, memberId });
  try {
    await deleteDoc(paymentRef);
    await removeSavingsRecord(resolvedDocId);

    if (memberId) {
      try {
        const members = await fetchAllMembers();
        const member =
          memberHint ??
          members.find((m) => m.id === memberId || m.uid === memberId);
        if (member) {
          const remaining = (await fetchAllPayments()).filter((p) => p.id !== resolvedDocId);
          const stillPaidThisMonth = isCurrentMonthPaid(remaining, member);
          await firestoreUpdateMemberDoc(member.id, { paid: stillPaidThisMonth });
        }
      } catch (memberErr) {
        console.warn("Member paid flag update failed after payment delete:", memberErr);
      }
    }
    console.log("Firestore success", resolvedDocId);
  } catch (err) {
    console.error("Firestore FAILED", err);
    throw err;
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

export function getDataMode(): "firebase" {
  return "firebase";
}
