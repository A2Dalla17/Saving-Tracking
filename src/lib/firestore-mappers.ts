import type {
  Announcement,
  AppSettings,
  ArchivedMemberRecord,
  ChatMessage,
  Member,
  Payment,
  Savings,
} from "@/types";
import { loginIdToEmail, normalizeLoginId } from "@/lib/member-credentials";

export function rowToMember(row: Record<string, unknown>): Member {
  const docId = (row.id as string) || "";
  const loginId =
    (row.loginId as string) ||
    (row.login_id as string) ||
    undefined;
  const email =
    (row.email as string) ||
    (loginId ? loginIdToEmail(loginId) : undefined) ||
    undefined;
  const contribution =
    row.contributionAmount != null
      ? Number(row.contributionAmount)
      : row.contribution != null
        ? Number(row.contribution)
        : row.monthly_fee != null
          ? Number(row.monthly_fee)
          : undefined;

  const createdAtRaw = row.createdAt ?? row.created_at;
  const uid = (row.uid as string) || docId || undefined;

  return {
    id: docId,
    uid,
    name: row.name as string,
    phone: (row.phone as string) || undefined,
    email,
    loginId: loginId ? normalizeLoginId(loginId) : email ? normalizeLoginId(email) : undefined,
    paid: typeof row.paid === "boolean" ? row.paid : false,
    password: (row.password as string) || undefined,
    joinDate: (row.join_date as string) || new Date().toISOString().slice(0, 10),
    endDate: (row.end_date as string) || undefined,
    monthlyFee: contribution,
    annualTarget: row.annual_target != null ? Number(row.annual_target) : contribution != null ? contribution * 12 : undefined,
    loginActive: row.login_active != null ? Boolean(row.login_active) : true,
    status: (row.status as Member["status"]) ?? "active",
    avatarUrl: (row.avatar_url as string) || undefined,
    createdAt: createdAtRaw
      ? new Date(createdAtRaw as string).toISOString()
      : new Date().toISOString(),
  };
}

export function memberToRow(member: Partial<Member> & { id: string; name: string }) {
  const loginId = member.loginId ?? (member.email ? normalizeLoginId(member.email) : "");
  const contribution = member.monthlyFee ?? null;
  const createdAt = member.createdAt ?? new Date().toISOString();

  return {
    name: member.name,
    uid: member.uid ?? member.id,
    loginId,
    login_id: loginId,
    contributionAmount: contribution,
    contribution,
    paid: member.paid ?? false,
    createdAt,
    created_at: createdAt,
    phone: member.phone ?? "",
    email: member.email ?? (loginId ? loginIdToEmail(loginId) : ""),
    password: member.password ?? null,
    join_date: member.joinDate,
    end_date: member.endDate ?? null,
    monthly_fee: contribution,
    annual_target: member.annualTarget ?? (contribution != null ? contribution * 12 : null),
    login_active: member.loginActive ?? false,
    status: member.status ?? "active",
    avatar_url: member.avatarUrl ?? null,
  };
}

export function newMemberToFirestore(input: {
  name: string;
  loginId: string;
  contribution: number;
  uid: string;
  joinDate: string;
  createdAt: string;
}) {
  const loginId = normalizeLoginId(input.loginId);
  const email = loginIdToEmail(loginId);
  return memberToRow({
    id: input.uid,
    uid: input.uid,
    name: input.name,
    loginId,
    email,
    joinDate: input.joinDate,
    monthlyFee: input.contribution,
    annualTarget: input.contribution * 12,
    loginActive: true,
    status: "active",
    paid: false,
    createdAt: input.createdAt,
  });
}

export function rowToPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    memberName: row.member_name as string,
    amount: Number(row.amount),
    month: row.month as string,
    year: Number(row.year),
    paidAt: new Date(row.paid_at as string).toISOString(),
    note: (row.note as string) || undefined,
  };
}

export function paymentToRow(payment: Payment) {
  return {
    id: payment.id,
    member_id: payment.memberId,
    member_name: payment.memberName,
    amount: payment.amount,
    month: payment.month,
    year: payment.year,
    paid_at: payment.paidAt,
    note: payment.note ?? "",
  };
}

export function rowToSavings(row: Record<string, unknown>): Savings {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    memberName: row.member_name as string,
    amount: Number(row.amount),
    month: row.month as string,
    year: Number(row.year),
    paidAt: new Date(row.paid_at as string).toISOString(),
    note: (row.note as string) || undefined,
    createdAt: row.created_at
      ? new Date(row.created_at as string).toISOString()
      : undefined,
  };
}

export function savingsToRow(savings: Savings) {
  return {
    id: savings.id,
    member_id: savings.memberId,
    member_name: savings.memberName,
    amount: savings.amount,
    month: savings.month,
    year: savings.year,
    paid_at: savings.paidAt,
    note: savings.note ?? "",
    created_at: savings.createdAt ?? savings.paidAt,
  };
}

export function paymentToSavings(payment: Payment): Savings {
  return {
    id: payment.id,
    memberId: payment.memberId,
    memberName: payment.memberName,
    amount: payment.amount,
    month: payment.month,
    year: payment.year,
    paidAt: payment.paidAt,
    note: payment.note,
    createdAt: payment.paidAt,
  };
}

export function rowToSettings(row: Record<string, unknown>): AppSettings {
  return {
    monthlyFee: Number(row.monthly_fee),
    groupGoal: Number(row.group_goal),
    groupStartDate: row.group_start_date as string,
    adminPin: row.admin_pin as string,
    adminEmail: row.admin_email as string,
    reminderDay: Number(row.reminder_day),
    lateFeeEscalation: Boolean(row.late_fee_escalation),
  };
}

export function settingsToRow(settings: AppSettings) {
  return {
    id: "app",
    monthly_fee: settings.monthlyFee,
    group_goal: settings.groupGoal,
    group_start_date: settings.groupStartDate,
    admin_pin: settings.adminPin,
    admin_email: settings.adminEmail,
    reminder_day: settings.reminderDay,
    late_fee_escalation: settings.lateFeeEscalation,
  };
}

export function rowToAnnouncement(row: Record<string, unknown>): Announcement {
  return {
    id: row.id as string,
    message: row.message as string,
    createdAt: new Date(row.created_at as string).toISOString(),
    expiresAt: new Date(row.expires_at as string).toISOString(),
  };
}

export function announcementToRow(item: Announcement) {
  return {
    id: item.id,
    message: item.message,
    created_at: item.createdAt,
    expires_at: item.expiresAt,
  };
}

export function rowToChat(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    fromAdmin: Boolean(row.from_admin),
    message: row.message as string,
    sentAt: new Date(row.sent_at as string).toISOString(),
    senderName: (row.sender_name as string) || undefined,
  };
}

export function chatToRow(item: ChatMessage) {
  return {
    id: item.id,
    member_id: item.memberId,
    from_admin: item.fromAdmin,
    message: item.message,
    sent_at: item.sentAt,
    sender_name: item.senderName ?? null,
  };
}

export function rowToBin(row: Record<string, unknown>): ArchivedMemberRecord {
  return {
    id: row.id as string,
    member: row.member as Member,
    payments: (row.payments as Payment[]) ?? [],
    chats: (row.chats as ChatMessage[]) ?? [],
    archivedAt: new Date(row.archived_at as string).toISOString(),
    reason: row.reason as ArchivedMemberRecord["reason"],
    totalPaid: Number(row.total_paid),
  };
}
