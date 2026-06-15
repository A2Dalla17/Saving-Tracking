import type {
  Announcement,
  AppSettings,
  ArchivedMemberRecord,
  ChatMessage,
  Member,
  Payment,
  Savings,
} from "@/types";

export function rowToMember(row: Record<string, unknown>): Member {
  return {
    id: row.id as string,
    name: row.name as string,
    phone: (row.phone as string) || undefined,
    email: (row.email as string) || undefined,
    password: (row.password as string) || undefined,
    joinDate: row.join_date as string,
    endDate: (row.end_date as string) || undefined,
    monthlyFee: row.monthly_fee != null ? Number(row.monthly_fee) : undefined,
    annualTarget: row.annual_target != null ? Number(row.annual_target) : undefined,
    loginActive: Boolean(row.login_active),
    status: (row.status as Member["status"]) ?? "active",
    avatarUrl: (row.avatar_url as string) || undefined,
    createdAt: row.created_at
      ? new Date(row.created_at as string).toISOString()
      : new Date().toISOString(),
  };
}

export function memberToRow(member: Partial<Member> & { id: string; name: string }) {
  return {
    id: member.id,
    name: member.name,
    phone: member.phone ?? "",
    email: member.email ?? "",
    password: member.password ?? null,
    join_date: member.joinDate,
    end_date: member.endDate ?? null,
    monthly_fee: member.monthlyFee ?? null,
    annual_target: member.annualTarget ?? null,
    login_active: member.loginActive ?? false,
    status: member.status ?? "active",
    avatar_url: member.avatarUrl ?? null,
    created_at: member.createdAt ?? new Date().toISOString(),
  };
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
  };
}

export function chatToRow(item: ChatMessage) {
  return {
    id: item.id,
    member_id: item.memberId,
    from_admin: item.fromAdmin,
    message: item.message,
    sent_at: item.sentAt,
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
