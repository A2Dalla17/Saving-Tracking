import { hashPassword } from "@/lib/auth";
import {
  ADMIN_EMAIL,
  ADMIN_FIREBASE_EMAIL,
  ADMIN_FIREBASE_PASSWORD,
  DEFAULT_SETTINGS,
} from "@/lib/constants";
import { getFirestoreAdmin, getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { memberToRow, settingsToRow, paymentToRow, announcementToRow, chatToRow, savingsToRow, paymentToSavings } from "@/lib/firestore-mappers";
import type { Announcement, AppSettings, ChatMessage, Member, Payment } from "@/types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function ensureAdminFirebaseAuthUser(): Promise<string | null> {
  const auth = getFirebaseAdminAuth();
  if (!auth) return null;

  try {
    const existing = await auth.getUserByEmail(ADMIN_FIREBASE_EMAIL);
    await auth.updateUser(existing.uid, {
      password: ADMIN_FIREBASE_PASSWORD,
      emailVerified: true,
      displayName: "AC7 Admin",
    });
    return existing.uid;
  } catch {
    const created = await auth.createUser({
      email: ADMIN_FIREBASE_EMAIL,
      password: ADMIN_FIREBASE_PASSWORD,
      emailVerified: true,
      displayName: "AC7 Admin",
    });
    return created.uid;
  }
}

export async function isFirestoreEmpty(): Promise<boolean> {
  const db = getFirestoreAdmin();
  if (!db) return false;
  const snap = await db.collection("members").limit(1).get();
  return snap.empty;
}

/** Seed only admin + settings — members are created via Admin page (Auth + Firestore unified). */
export async function seedFirestoreIfEmpty(): Promise<{ seeded: boolean; reason?: string }> {
  const db = getFirestoreAdmin();
  if (!db) return { seeded: false, reason: "admin-missing" };

  const existing = await db.collection("members").limit(1).get();
  if (!existing.empty) return { seeded: false };

  const adminUid = await ensureAdminFirebaseAuthUser();
  if (!adminUid) return { seeded: false, reason: "admin-auth-missing" };

  const now = new Date().toISOString();
  const batch = db.batch();

  batch.set(
    db.collection("members").doc(adminUid),
    memberToRow({
      id: adminUid,
      uid: adminUid,
      name: "Maamulaha",
      email: ADMIN_EMAIL,
      phone: "",
      password: hashPassword(ADMIN_FIREBASE_PASSWORD),
      joinDate: DEFAULT_SETTINGS.groupStartDate,
      monthlyFee: 0,
      annualTarget: 0,
      loginActive: true,
      status: "active",
      createdAt: now,
    })
  );

  batch.set(db.collection("app_settings").doc("app"), settingsToRow(DEFAULT_SETTINGS));
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
  const db = getFirestoreAdmin();
  if (!db) return { imported: false, reason: "admin-missing" };

  const existing = await db.collection("members").limit(1).get();
  if (!existing.empty) return { imported: false, reason: "already-has-data" };

  const members = payload.members ?? [];
  if (members.length === 0) return { imported: false, reason: "no-local-data" };

  const batch = db.batch();

  for (const m of members) {
    const id = m.id || generateId();
    batch.set(db.collection("members").doc(id), memberToRow({ ...m, id, name: m.name }));
  }

  if (payload.payments?.length) {
    for (const p of payload.payments) {
      const id = p.id || generateId();
      const payment = { ...p, id };
      batch.set(db.collection("payments").doc(id), paymentToRow(payment));
      batch.set(db.collection("savings").doc(id), savingsToRow(paymentToSavings(payment)));
    }
  }

  if (payload.settings) {
    batch.set(db.collection("app_settings").doc("app"), settingsToRow(payload.settings));
  }

  if (payload.announcements?.length) {
    for (const a of payload.announcements) {
      const id = a.id || generateId();
      batch.set(db.collection("announcements").doc(id), announcementToRow({ ...a, id }));
    }
  }

  if (payload.chats?.length) {
    for (const c of payload.chats) {
      const id = c.id || generateId();
      batch.set(db.collection("chats").doc(id), chatToRow({ ...c, id }));
    }
  }

  await batch.commit();
  return { imported: true };
}
