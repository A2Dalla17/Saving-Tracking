import { verifyPassword, isAdminEmail } from "@/lib/auth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { rowToMember } from "@/lib/firestore-mappers";
import { loginIdToEmail, normalizeLoginId } from "@/lib/member-credentials";
import type { Member } from "@/types";

export async function findMemberByIdentifier(identifier: string): Promise<Member | null> {
  const db = getFirestoreAdmin();
  if (!db) return null;

  const id = identifier.trim().toLowerCase();
  const phoneId = identifier.replace(/\s/g, "");
  const localPart = normalizeLoginId(identifier).toLowerCase();
  const snap = await db.collection("members").get();
  if (snap.empty) return null;

  for (const docSnap of snap.docs) {
    const member = rowToMember({ id: docSnap.id, ...docSnap.data() });
    if (member.email?.toLowerCase() === id) return member;
    if (member.loginId?.toLowerCase() === localPart) return member;
    if (normalizeLoginId(member.email ?? "").toLowerCase() === localPart) return member;
    if (loginIdToEmail(member.loginId ?? member.email ?? "") === loginIdToEmail(identifier)) {
      return member;
    }
    if (member.phone?.replace(/\s/g, "") === phoneId) return member;
  }
  return null;
}

export function validateMemberLogin(member: Member, password: string): string | null {
  if (!member.loginActive) return "Login-kaaga weli ma active gashan. La xiriir admin-ka.";
  if (member.status === "removed") return "Waxaa lagaa saaray kooxda. La xiriir admin-ka.";
  if (!member.password || !verifyPassword(password, member.password)) {
    return "Password-ka waa khaldan yahay";
  }
  return null;
}

export function toAuthUser(member: Member) {
  return {
    memberId: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    isAdmin:
      isAdminEmail(member.email ?? "") ||
      member.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
  };
}
