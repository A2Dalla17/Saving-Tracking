import { verifyPassword, isAdminEmail } from "@/lib/auth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { rowToMember } from "@/lib/supabase-mappers";
import type { Member } from "@/types";

export async function findMemberByIdentifier(identifier: string): Promise<Member | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const id = identifier.trim().toLowerCase();
  const phoneId = identifier.replace(/\s/g, "");
  const { data, error } = await supabase.from("members").select("*");
  if (error || !data) return null;

  for (const row of data) {
    const member = rowToMember(row);
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
