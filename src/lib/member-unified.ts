import type { UserRecord } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import { ADMIN_EMAIL, ADMIN_FIREBASE_EMAIL, DEFAULT_SETTINGS } from "@/lib/constants";
import {
  loginIdToEmail,
  normalizeLoginId,
  MEMBER_AUTH_DOMAIN,
  isValidMemberLoginId,
} from "@/lib/member-credentials";
import { rowToMember, memberToRow } from "@/lib/firestore-mappers";
import { getFirebaseAdminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import type { Member } from "@/types";

export interface SyncResult {
  created: number;
  migrated: number;
  linked: number;
  totalAuthUsers: number;
  totalFirestoreMembers: number;
}

export interface CreateMemberInput {
  name: string;
  loginId: string;
  password: string;
  contribution: number;
}

function isProtectedAuthEmail(email: string | undefined): boolean {
  if (!email) return true;
  const lower = email.trim().toLowerCase();
  return (
    lower === ADMIN_EMAIL.toLowerCase() ||
    lower === ADMIN_FIREBASE_EMAIL.toLowerCase()
  );
}

export function isMemberAuthEmail(email: string | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(MEMBER_AUTH_DOMAIN);
}

function memberLoginKey(member: Member): string {
  const loginId = member.loginId ?? normalizeLoginId(member.email ?? "");
  return loginId.toLowerCase();
}

function authLoginKey(user: UserRecord): string {
  return normalizeLoginId(user.email ?? "");
}

async function listAllAuthUsers(auth: Auth): Promise<UserRecord[]> {
  const users: UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

function buildMemberDocFromAuth(user: UserRecord, contribution = DEFAULT_SETTINGS.monthlyFee) {
  const email = user.email!.toLowerCase();
  const loginId = authLoginKey(user);
  const createdAt = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toISOString()
    : new Date().toISOString();

  return {
    name: user.displayName?.trim() || loginId,
    loginId,
    login_id: loginId,
    contributionAmount: contribution,
    contribution,
    paid: false,
    createdAt,
    created_at: createdAt,
    uid: user.uid,
    email,
    join_date: DEFAULT_SETTINGS.groupStartDate,
    monthly_fee: contribution,
    annual_target: contribution * 12,
    login_active: true,
    status: "active" as const,
  };
}

/** Link Firebase Auth users ↔ Firestore members/{uid} — one account, one document. */
export async function syncAuthUsersToFirestore(): Promise<SyncResult> {
  const auth = getFirebaseAdminAuth();
  const db = getFirestoreAdmin();
  if (!auth || !db) {
    throw new Error("Firebase Admin ma diyaar ahayn");
  }

  const snapshot = await db.collection("members").get();
  const byDocId = new Map<string, Member>();
  const byEmail = new Map<string, { docId: string; member: Member }>();
  const byLoginId = new Map<string, { docId: string; member: Member }>();

  for (const doc of snapshot.docs) {
    const member = rowToMember({ id: doc.id, ...doc.data() });
    byDocId.set(doc.id, member);
    const email = member.email?.trim().toLowerCase();
    if (email) byEmail.set(email, { docId: doc.id, member });
    const loginKey = memberLoginKey(member);
    if (loginKey) byLoginId.set(loginKey, { docId: doc.id, member });
  }

  const authUsers = await listAllAuthUsers(auth);
  let created = 0;
  let migrated = 0;
  let linked = 0;

  for (const user of authUsers) {
    if (isProtectedAuthEmail(user.email)) continue;
    if (!isMemberAuthEmail(user.email)) continue;

    const email = user.email!.toLowerCase();
    const loginId = authLoginKey(user);
    const uidRef = db.collection("members").doc(user.uid);

    if (byDocId.has(user.uid)) {
      await uidRef.set(
        { uid: user.uid, email, loginId, login_id: loginId, login_active: true },
        { merge: true }
      );
      linked++;
      continue;
    }

    const legacyByEmail = byEmail.get(email);
    const legacyByLogin = byLoginId.get(loginId);
    const legacy = legacyByEmail ?? legacyByLogin;

    if (legacy && legacy.docId !== user.uid) {
      const merged = normalizeMemberFromFirestore(legacy.member, user);
      await uidRef.set(memberToRow(merged), { merge: true });
      if (legacy.docId !== user.uid) {
        await db.collection("members").doc(legacy.docId).delete();
      }
      migrated++;
      byDocId.set(user.uid, merged);
      continue;
    }

    await uidRef.set(buildMemberDocFromAuth(user), { merge: true });
    created++;
  }

  return {
    created,
    migrated,
    linked,
    totalAuthUsers: authUsers.filter(
      (u) => isMemberAuthEmail(u.email) && !isProtectedAuthEmail(u.email)
    ).length,
    totalFirestoreMembers: snapshot.size,
  };
}

function normalizeMemberFromFirestore(member: Member, user: UserRecord): Member {
  const loginId = authLoginKey(user);
  return {
    ...member,
    id: user.uid,
    uid: user.uid,
    email: user.email!.toLowerCase(),
    loginId,
    name: member.name || user.displayName?.trim() || loginId,
    loginActive: member.loginActive ?? true,
    status: member.status === "removed" ? "removed" : member.status ?? "active",
  };
}

export async function listAllMembersUnified(options?: { sync?: boolean }): Promise<Member[]> {
  if (options?.sync !== false) {
    await syncAuthUsersToFirestore();
  }
  const db = getFirestoreAdmin();
  if (!db) throw new Error("Firebase Admin ma diyaar ahayn");

  const snapshot = await db.collection("members").get();
  return snapshot.docs
    .map((doc) => rowToMember({ id: doc.id, ...doc.data() }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function findMemberByLoginId(
  db: Firestore,
  loginId: string
): Promise<{ docId: string; member: Member } | null> {
  const key = normalizeLoginId(loginId).toLowerCase();
  if (!key) return null;

  const snapshot = await db.collection("members").get();
  for (const doc of snapshot.docs) {
    const member = rowToMember({ id: doc.id, ...doc.data() });
    if (memberLoginKey(member) === key) {
      return { docId: doc.id, member };
    }
  }
  return null;
}

/** Create or link one member — never duplicate Auth or Firestore. */
export async function createMemberUnified(input: CreateMemberInput): Promise<{
  uid: string;
  email: string;
  loginId: string;
  created: boolean;
}> {
  const auth = getFirebaseAdminAuth();
  const db = getFirestoreAdmin();
  if (!auth || !db) throw new Error("Firebase Admin ma diyaar ahayn");

  const name = input.name.trim();
  const loginId = normalizeLoginId(input.loginId);
  const password = input.password;
  const contribution = Number(input.contribution);
  const email = loginIdToEmail(loginId);

  if (!name) throw new Error("Magaca xubinta waa lagama maarmaan");
  if (!isValidMemberLoginId(loginId)) throw new Error("Login ID aan sax ahayn");
  if (!password || password.length < 6) throw new Error("Password waa inuu ugu yaraan 6 xaraf yahay");
  if (!Number.isFinite(contribution) || contribution <= 0) {
    throw new Error("Lacagta bishii waa inay ka weyn tahay 0");
  }

  const existingDoc = await findMemberByLoginId(db, loginId);
  let existingAuthUid: string | undefined;
  try {
    existingAuthUid = (await auth.getUserByEmail(email)).uid;
  } catch {
    existingAuthUid = undefined;
  }

  if (existingDoc) {
    const linkedUid = existingDoc.member.uid ?? existingDoc.docId;
    if (existingAuthUid && linkedUid !== existingAuthUid && existingDoc.docId !== existingAuthUid) {
      throw new Error("Login ID-kan horey ayaa loo isticmaalay");
    }
    if (existingAuthUid && existingDoc.docId === existingAuthUid) {
      await db.collection("members").doc(existingAuthUid).set(
        {
          name,
          loginId,
          login_id: loginId,
          email,
          uid: existingAuthUid,
          contributionAmount: contribution,
          monthly_fee: contribution,
          annual_target: contribution * 12,
          login_active: true,
          status: "active",
        },
        { merge: true }
      );
      await auth.updateUser(existingAuthUid, { password, displayName: name, emailVerified: true });
      return { uid: existingAuthUid, email, loginId, created: false };
    }
  }

  let uid: string;
  let created = true;
  try {
    const user = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
    });
    uid = user.uid;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/email-already-exists") {
      const existing = await auth.getUserByEmail(email);
      uid = existing.uid;
      created = false;
      await auth.updateUser(uid, { password, displayName: name, emailVerified: true });
    } else {
      throw err;
    }
  }

  if (existingDoc && existingDoc.docId !== uid) {
    const merged = {
      ...memberToRow({ ...existingDoc.member, id: uid, uid, name, loginId, email }),
      contributionAmount: contribution,
      monthly_fee: contribution,
      annual_target: contribution * 12,
      login_active: true,
      status: "active",
    };
    await db.collection("members").doc(uid).set(merged, { merge: true });
    await db.collection("members").doc(existingDoc.docId).delete();
  } else {
    const createdAt = new Date().toISOString();
    await db.collection("members").doc(uid).set(
      {
        name,
        loginId,
        login_id: loginId,
        contributionAmount: contribution,
        contribution,
        paid: false,
        createdAt,
        created_at: createdAt,
        uid,
        email,
        join_date: DEFAULT_SETTINGS.groupStartDate,
        monthly_fee: contribution,
        annual_target: contribution * 12,
        login_active: true,
        status: "active",
      },
      { merge: true }
    );
  }

  const verify = await db.collection("members").doc(uid).get();
  if (!verify.exists) {
    throw new Error("Firestore kaydin wuu fashilmay — xubin lama kaydin");
  }

  return { uid, email, loginId, created };
}

/** Delete Firebase Auth user AND Firestore members/{uid}. */
export async function deleteMemberUnified(options: {
  uid?: string;
  email?: string;
  loginId?: string;
}): Promise<{ uid: string; authDeleted: boolean; firestoreDeleted: boolean }> {
  const auth = getFirebaseAdminAuth();
  const db = getFirestoreAdmin();
  if (!auth || !db) throw new Error("Firebase Admin ma diyaar ahayn");

  let targetUid = options.uid?.trim();
  const email =
    options.email?.trim().toLowerCase() ||
    (options.loginId ? loginIdToEmail(options.loginId) : undefined);

  if (!targetUid && email) {
    if (isProtectedAuthEmail(email)) {
      throw new Error("Maamulaha lama tirtiri karo");
    }
    const user = await auth.getUserByEmail(email);
    targetUid = user.uid;
  }

  if (!targetUid) {
    throw new Error("UID ama email waa lagama maarmaan");
  }

  if (email && isProtectedAuthEmail(email)) {
    throw new Error("Maamulaha lama tirtiri karo");
  }

  let authDeleted = false;
  try {
    await auth.deleteUser(targetUid);
    authDeleted = true;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== "auth/user-not-found") throw err;
  }

  let firestoreDeleted = false;
  const memberRef = db.collection("members").doc(targetUid);
  const snap = await memberRef.get();
  if (snap.exists) {
    await memberRef.delete();
    firestoreDeleted = true;
  } else {
    const all = await db.collection("members").get();
    for (const doc of all.docs) {
      const member = rowToMember({ id: doc.id, ...doc.data() });
      if (member.uid === targetUid || member.email?.toLowerCase() === email) {
        await db.collection("members").doc(doc.id).delete();
        firestoreDeleted = true;
      }
    }
  }

  return { uid: targetUid, authDeleted, firestoreDeleted };
}

export async function updateMemberPasswordUnified(uid: string, password: string): Promise<void> {
  const auth = getFirebaseAdminAuth();
  if (!auth) throw new Error("Firebase Admin ma diyaar ahayn");
  if (!password || password.length < 6) {
    throw new Error("Password waa inuu ugu yaraan 6 xaraf yahay");
  }
  await auth.updateUser(uid, { password });
}
