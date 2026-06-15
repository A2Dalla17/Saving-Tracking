import { hashPassword } from "@/lib/auth";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  COLLECTIONS,
  DEFAULT_MEMBER_PASSWORD,
  DEFAULT_MEMBER_PROFILES,
  DEFAULT_SETTINGS,
} from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Announcement, AppSettings, ChatMessage, Member, Payment } from "@/types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function isFirestoreEmpty(): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  const snap = await db.collection(COLLECTIONS.MEMBERS).limit(1).get();
  return snap.empty;
}

export async function seedFirestoreIfEmpty(): Promise<{ seeded: boolean; reason?: string }> {
  const db = getAdminDb();
  if (!db) return { seeded: false, reason: "admin-sdk-missing" };

  const existing = await db.collection(COLLECTIONS.MEMBERS).limit(1).get();
  if (!existing.empty) return { seeded: false };

  const now = new Date().toISOString();
  const batch = db.batch();

  for (const profile of DEFAULT_MEMBER_PROFILES) {
    const id = generateId();
    const member: Member = {
      id,
      name: profile.name,
      email: profile.email,
      phone: "",
      password: hashPassword(DEFAULT_MEMBER_PASSWORD),
      joinDate: DEFAULT_SETTINGS.groupStartDate,
      monthlyFee: profile.monthlyFee,
      annualTarget: profile.annualTarget,
      loginActive: false,
      status: "active",
      createdAt: now,
    };
    batch.set(db.collection(COLLECTIONS.MEMBERS).doc(id), member);
  }

  const adminId = generateId();
  const adminMember: Member = {
    id: adminId,
    name: "Maamulaha",
    email: ADMIN_EMAIL,
    phone: "",
    password: hashPassword(ADMIN_PASSWORD),
    joinDate: DEFAULT_SETTINGS.groupStartDate,
    monthlyFee: 0,
    annualTarget: 0,
    loginActive: true,
    status: "active",
    createdAt: now,
  };
  batch.set(db.collection(COLLECTIONS.MEMBERS).doc(adminId), adminMember);
  batch.set(db.collection(COLLECTIONS.SETTINGS).doc("app"), DEFAULT_SETTINGS as AppSettings);

  await batch.commit();
  return { seeded: true };
}

export interface LocalCloudPayload {
  members?: Member[];
  payments?: Payment[];
  settings?: AppSettings;
  announcements?: Announcement[];
  chats?: ChatMessage[];
}

export async function importLocalDataToFirestore(
  payload: LocalCloudPayload
): Promise<{ imported: boolean; reason?: string }> {
  const db = getAdminDb();
  if (!db) return { imported: false, reason: "admin-sdk-missing" };

  const existing = await db.collection(COLLECTIONS.MEMBERS).limit(1).get();
  if (!existing.empty) return { imported: false, reason: "already-has-data" };

  const members = payload.members ?? [];
  if (members.length === 0) return { imported: false, reason: "no-local-data" };

  const batch = db.batch();

  for (const member of members) {
    const id = member.id || generateId();
    batch.set(db.collection(COLLECTIONS.MEMBERS).doc(id), { ...member, id });
  }

  for (const payment of payload.payments ?? []) {
    const id = payment.id || generateId();
    batch.set(db.collection(COLLECTIONS.PAYMENTS).doc(id), { ...payment, id });
  }

  if (payload.settings) {
    batch.set(db.collection(COLLECTIONS.SETTINGS).doc("app"), payload.settings, { merge: true });
  }

  for (const item of payload.announcements ?? []) {
    const id = item.id || generateId();
    batch.set(db.collection(COLLECTIONS.ANNOUNCEMENTS).doc(id), { ...item, id });
  }

  for (const chat of payload.chats ?? []) {
    const id = chat.id || generateId();
    batch.set(db.collection(COLLECTIONS.CHATS).doc(id), { ...chat, id });
  }

  await batch.commit();
  return { imported: true };
}
