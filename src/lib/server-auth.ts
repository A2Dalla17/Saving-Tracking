import { verifyPassword, isAdminEmail } from "@/lib/auth";
import { ADMIN_EMAIL, COLLECTIONS } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Member } from "@/types";

export async function findMemberByIdentifier(identifier: string): Promise<Member | null> {
  const db = getAdminDb();
  if (!db) return null;

  const id = identifier.trim().toLowerCase();
  const phoneId = identifier.replace(/\s/g, "");
  const snapshot = await db.collection(COLLECTIONS.MEMBERS).get();

  for (const doc of snapshot.docs) {
    const member = { id: doc.id, ...doc.data() } as Member;
    if (member.email?.toLowerCase() === id) return member;
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
