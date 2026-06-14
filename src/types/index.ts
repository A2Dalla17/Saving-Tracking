export type MemberStatus = "active" | "warning" | "removed";

export interface Member {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  password?: string;
  joinDate: string;
  endDate?: string;
  monthlyFee?: number;
  annualTarget?: number;
  loginActive: boolean;
  status: MemberStatus;
  avatarUrl?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  month: string;
  year: number;
  paidAt: string;
  note?: string;
}

export interface AppSettings {
  monthlyFee: number;
  groupGoal: number;
  groupStartDate: string;
  adminPin: string;
  adminEmail: string;
  reminderDay: number;
  lateFeeEscalation: boolean;
}

export interface Announcement {
  id: string;
  message: string;
  createdAt: string;
  expiresAt: string;
}

export interface ChatMessage {
  id: string;
  memberId: string;
  fromAdmin: boolean;
  message: string;
  sentAt: string;
}

export interface ArchivedMemberRecord {
  id: string;
  member: Member;
  payments: Payment[];
  chats: ChatMessage[];
  archivedAt: string;
  reason: "auto_removed" | "admin_removed";
  totalPaid: number;
}

export interface AuthUser {
  memberId: string;
  name: string;
  email?: string;
  phone?: string;
  isAdmin: boolean;
}

export interface MemberStats {
  member: Member;
  totalPaid: number;
  debt: number;
  sharePercent: number;
  monthsPaid: number;
  isCurrentMonthPaid: boolean;
  currentMonthDue: number;
  nextMonthDue: number;
  consecutiveMissed: number;
  ownershipValue: number;
  memberMonthlyFee: number;
  annualTarget: number;
  annualProgress: number;
}

export interface GroupStats {
  totalSavings: number;
  totalDebt: number;
  memberCount: number;
  monthsElapsed: number;
  monthlyFee: number;
  groupGoal: number;
  goalProgress: number;
}

export interface ChartDataPoint {
  month: string;
  savings: number;
  label: string;
}

export interface FinancialStatement {
  somali: string;
  english: string;
  generatedAt: string;
}

export interface CalendarPayment {
  payment: Payment;
  day: number;
  time: string;
}
