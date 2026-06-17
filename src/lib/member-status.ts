import type { Member, MemberStatus, Payment } from "@/types";
import { paymentBelongsToMember } from "./calculations";
import { ADMIN_EMAIL, ADMIN_FIREBASE_EMAIL, REMOVAL_MISS_THRESHOLD, WARNING_MISS_THRESHOLD } from "./constants";

export function isAdminMember(member: Member): boolean {
  return (
    member.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
    member.email?.toLowerCase() === ADMIN_FIREBASE_EMAIL.toLowerCase() ||
    member.name.trim().toLowerCase() === "maamulaha"
  );
}

export function getPayingMembers(members: Member[]): Member[] {
  return members.filter((m) => !isAdminMember(m) && m.status !== "removed");
}

export function filterPayingPayments(members: Member[], payments: Payment[]): Payment[] {
  const payingMembers = getPayingMembers(members);
  return payments.filter((p) => payingMembers.some((m) => paymentBelongsToMember(p, m)));
}

export function resolveMemberStatus(consecutiveMissed: number): MemberStatus {
  if (consecutiveMissed >= REMOVAL_MISS_THRESHOLD) return "removed";
  if (consecutiveMissed >= WARNING_MISS_THRESHOLD) return "warning";
  return "active";
}

export function shouldDeactivateLogin(status: MemberStatus): boolean {
  return status === "removed";
}

export function getStatusLabel(status: MemberStatus): string {
  switch (status) {
    case "warning":
      return "Digniin Ugu Dambeysay";
    case "removed":
      return "Laga Saaray Kooxda";
    default:
      return "Firfircoon";
  }
}

export function getActiveMembers(members: Member[]): Member[] {
  return members.filter((m) => m.status !== "removed");
}
