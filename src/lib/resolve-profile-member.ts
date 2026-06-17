import { ADMIN_EMAIL, DEFAULT_SETTINGS } from "@/lib/constants";
import { isAdminMember } from "@/lib/member-status";
import { normalizeLoginId } from "@/lib/member-auth";
import type { AuthUser, Member } from "@/types";

function normalizeEmail(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

function buildFallbackAdminMember(user: AuthUser): Member {
  return {
    id: user.memberId === "admin-bootstrap" ? "admin-profile" : user.memberId,
    name: user.name || "Maamulaha",
    email: user.email ?? ADMIN_EMAIL,
    phone: user.phone ?? "",
    joinDate: DEFAULT_SETTINGS.groupStartDate,
    monthlyFee: 0,
    annualTarget: 0,
    loginActive: true,
    status: "active",
    paid: false,
    createdAt: new Date().toISOString(),
  };
}

/** Match logged-in user to a Firestore member for profile pages. */
export function resolveProfileMember(
  members: Member[],
  user: AuthUser | null | undefined
): Member | undefined {
  if (!user) return undefined;

  const userEmail = normalizeEmail(user.email);
  const userLoginId = userEmail ? normalizeLoginId(userEmail).toLowerCase() : "";
  const userName = user.name.trim().toLowerCase();

  const bySession = members.find((member) => {
    if (member.id === user.memberId || member.uid === user.memberId) return true;
    if (userEmail && normalizeEmail(member.email) === userEmail) return true;
    if (userLoginId) {
      const memberLogin = (member.loginId ?? normalizeLoginId(member.email ?? "")).toLowerCase();
      if (memberLogin === userLoginId) return true;
    }
    if (userName && member.name.trim().toLowerCase() === userName) return true;
    return false;
  });
  if (bySession) return bySession;

  const adminMember = members.find((member) => isAdminMember(member));
  if (user.isAdmin && adminMember) return adminMember;

  if (user.isAdmin) {
    return buildFallbackAdminMember(user);
  }

  return undefined;
}

export function isOwnProfileMember(member: Member, user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.memberId === member.id || user.memberId === member.uid) return true;
  if (user.email && normalizeEmail(member.email) === normalizeEmail(user.email)) return true;
  if (user.isAdmin && isAdminMember(member)) return true;
  return false;
}
