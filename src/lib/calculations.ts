import { DEFAULT_SETTINGS, SOMALI_MONTHS } from "./constants";
import type { Member, Payment, MemberStats, GroupStats, ChartDataPoint, AppSettings, CalendarPayment } from "@/types";

export function getSettingsDate(settings?: AppSettings): Date {
  return new Date(settings?.groupStartDate ?? DEFAULT_SETTINGS.groupStartDate);
}

export function getMonthlyFee(settings?: AppSettings): number {
  return settings?.monthlyFee ?? DEFAULT_SETTINGS.monthlyFee;
}

export function getMemberMonthlyFee(member: Member, settings?: AppSettings): number {
  return member.monthlyFee ?? getMonthlyFee(settings);
}

export function getMemberAnnualTarget(member: Member, settings?: AppSettings): number {
  return member.annualTarget ?? getMonthlyFee(settings) * 12;
}

export function getMonthsElapsed(date: Date = new Date(), settings?: AppSettings): number {
  const start = getSettingsDate(settings);
  if (date < start) return 0;

  const startYear = start.getFullYear();
  const startMonth = start.getMonth();
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth();

  return (currentYear - startYear) * 12 + (currentMonth - startMonth) + 1;
}

export function getCurrentMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthKey(year: number, month: string | number): string {
  const monthNum = typeof month === "number" ? month : getMonthNumber(month);
  return `${year}-${String(monthNum).padStart(2, "0")}`;
}

export function getMonthNumber(month: string): number {
  const months: Record<string, number> = {
    January: 1, February: 2, March: 3, April: 4,
    May: 5, June: 6, July: 7, August: 8,
    September: 9, October: 10, November: 11, December: 12,
    Janaayo: 1, Febraayo: 2, Maarso: 3, Abriil: 4,
    Maajo: 5, Juun: 6, Luulyo: 7, Agoosto: 8,
    Sebtembar: 9, Oktoobar: 10, Nofembar: 11, Diseembar: 12,
  };
  return months[month] ?? (parseInt(month, 10) || 1);
}

export function getMonthName(date: Date = new Date()): string {
  return SOMALI_MONTHS[date.getMonth()];
}

export function getMonthNameByIndex(index: number): string {
  return SOMALI_MONTHS[index] ?? "Unknown";
}

export function getMemberActiveMonths(member: Member, settings?: AppSettings, date: Date = new Date()): string[] {
  const start = getSettingsDate(settings);
  const join = new Date(member.joinDate);
  const effectiveStart = join > start ? join : start;
  const end = member.endDate ? new Date(member.endDate) : date;
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  const months: string[] = [];
  const cursor = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), 1);

  while (cursor <= endMonth) {
    months.push(getCurrentMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

export function paymentBelongsToMember(payment: Payment, member: Member): boolean {
  if (payment.memberId === member.id) return true;
  if (member.uid && payment.memberId === member.uid) return true;
  return false;
}

export function findCurrentMonthPayment(
  payments: Payment[],
  member: Member,
  date: Date = new Date()
): Payment | undefined {
  const monthKey = getCurrentMonthKey(date);
  return payments.find(
    (p) => paymentBelongsToMember(p, member) && formatMonthKey(p.year, p.month) === monthKey
  );
}

export function isMonthPaid(payments: Payment[], member: Member, monthKey: string): boolean {
  return payments.some(
    (p) => paymentBelongsToMember(p, member) && formatMonthKey(p.year, p.month) === monthKey
  );
}

export function getConsecutiveMissedBefore(
  member: Member,
  payments: Payment[],
  settings?: AppSettings,
  date: Date = new Date()
): number {
  const activeMonths = getMemberActiveMonths(member, settings, date);
  const currentKey = getCurrentMonthKey(date);
  const priorMonths = activeMonths.filter((m) => m < currentKey);

  let streak = 0;
  for (let i = priorMonths.length - 1; i >= 0; i--) {
    if (!isMonthPaid(payments, member, priorMonths[i])) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function getCurrentMonthDue(
  member: Member,
  payments: Payment[],
  settings?: AppSettings,
  date: Date = new Date()
): number {
  const fee = getMemberMonthlyFee(member, settings);
  const escalation = settings?.lateFeeEscalation ?? true;
  if (!escalation) return fee;

  const missed = getConsecutiveMissedBefore(member, payments, settings, date);
  return fee * (missed + 1);
}

export function getNextMonthDue(
  member: Member,
  payments: Payment[],
  settings?: AppSettings,
  date: Date = new Date()
): number {
  const fee = getMemberMonthlyFee(member, settings);
  const escalation = settings?.lateFeeEscalation ?? true;
  if (!escalation || isCurrentMonthPaid(payments, member, date)) return fee;

  const missedBefore = getConsecutiveMissedBefore(member, payments, settings, date);
  return fee * (missedBefore + 2);
}

export function calculateMemberDebt(
  member: Member,
  payments: Payment[],
  settings?: AppSettings,
  date: Date = new Date()
): number {
  const fee = getMemberMonthlyFee(member, settings);
  const escalation = settings?.lateFeeEscalation ?? true;
  const activeMonths = getMemberActiveMonths(member, settings, date);
  const totalPaid = getMemberTotalPaid(payments, member);

  let expected = 0;
  let consecutiveMissed = 0;

  for (const monthKey of activeMonths) {
    const paid = isMonthPaid(payments, member, monthKey);
    if (!paid) {
      consecutiveMissed++;
      expected += escalation ? fee * consecutiveMissed : fee;
    } else {
      consecutiveMissed = 0;
    }
  }

  return Math.max(0, expected - totalPaid);
}

export function calculateSharePercent(memberPaid: number, groupTotal: number): number {
  if (groupTotal <= 0) return 0;
  return (memberPaid / groupTotal) * 100;
}

export function getMemberPayments(payments: Payment[], member: Member): Payment[] {
  return payments.filter((p) => paymentBelongsToMember(p, member));
}

export function getMemberTotalPaid(payments: Payment[], member: Member): number {
  return getMemberPayments(payments, member).reduce((sum, p) => sum + p.amount, 0);
}

export function isCurrentMonthPaid(payments: Payment[], member: Member, date: Date = new Date()): boolean {
  return isMonthPaid(payments, member, getCurrentMonthKey(date));
}

export function getLastMemberPayment(payments: Payment[], member: Member): Payment | undefined {
  const memberPayments = getMemberPayments(payments, member);
  if (memberPayments.length === 0) return undefined;
  return [...memberPayments].sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
  )[0];
}

export function calculateMemberStats(
  member: Member,
  payments: Payment[],
  groupTotal: number,
  settings?: AppSettings,
  date: Date = new Date()
): MemberStats {
  const totalPaid = getMemberTotalPaid(payments, member);
  const memberPayments = getMemberPayments(payments, member);
  const consecutiveMissed = getConsecutiveMissedBefore(member, payments, settings, date);
  const memberMonthlyFee = getMemberMonthlyFee(member, settings);
  const annualTarget = getMemberAnnualTarget(member, settings);

  return {
    member,
    totalPaid,
    debt: calculateMemberDebt(member, payments, settings, date),
    sharePercent: calculateSharePercent(totalPaid, groupTotal),
    monthsPaid: memberPayments.length,
    isCurrentMonthPaid: isCurrentMonthPaid(payments, member, date),
    currentMonthDue: getCurrentMonthDue(member, payments, settings, date),
    nextMonthDue: getNextMonthDue(member, payments, settings, date),
    consecutiveMissed,
    ownershipValue: totalPaid,
    memberMonthlyFee,
    annualTarget,
    annualProgress: annualTarget > 0 ? Math.min(100, (totalPaid / annualTarget) * 100) : 0,
  };
}

export function calculateGroupStats(
  members: Member[],
  payments: Payment[],
  settings?: AppSettings,
  date: Date = new Date()
): GroupStats {
  const totalSavings = payments.reduce((sum, p) => sum + p.amount, 0);
  const monthsElapsed = getMonthsElapsed(date, settings);
  const monthlyFee = getMonthlyFee(settings);
  const groupGoal = settings?.groupGoal ?? DEFAULT_SETTINGS.groupGoal;

  let totalDebt = 0;
  for (const member of members) {
    totalDebt += calculateMemberDebt(member, payments, settings, date);
  }

  return {
    totalSavings,
    totalDebt,
    memberCount: members.length,
    monthsElapsed,
    monthlyFee,
    groupGoal,
    goalProgress: groupGoal > 0 ? Math.min(100, (totalSavings / groupGoal) * 100) : 0,
  };
}

export function buildSavingsChartData(payments: Payment[]): ChartDataPoint[] {
  const monthlyTotals = new Map<string, number>();
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime()
  );

  let cumulative = 0;

  if (sortedPayments.length === 0) {
    return [{ month: getCurrentMonthKey(), savings: 0, label: getMonthName() }];
  }

  for (const payment of sortedPayments) {
    const key = formatMonthKey(payment.year, payment.month);
    cumulative += payment.amount;
    monthlyTotals.set(key, cumulative);
  }

  const dataPoints: ChartDataPoint[] = [];
  const sortedKeys = Array.from(monthlyTotals.keys()).sort();
  for (const key of sortedKeys) {
    const [, monthStr] = key.split("-");
    const monthIndex = parseInt(monthStr, 10) - 1;
    dataPoints.push({
      month: key,
      savings: monthlyTotals.get(key) ?? 0,
      label: SOMALI_MONTHS[monthIndex] ?? key,
    });
  }

  return dataPoints;
}

export function getPaymentsForCalendarMonth(
  payments: Payment[],
  year: number,
  monthIndex: number
): CalendarPayment[] {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

  return payments
    .filter((p) => formatMonthKey(p.year, p.month) === monthKey)
    .map((payment) => {
      const paidDate = new Date(payment.paidAt);
      return {
        payment,
        day: paidDate.getDate(),
        time: paidDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      };
    })
    .sort((a, b) => a.day - b.day);
}

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex, 1).getDay();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("so-SO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shouldShowMonthlyReminder(settings?: AppSettings, date: Date = new Date()): boolean {
  const reminderDay = settings?.reminderDay ?? 15;
  return date.getDate() >= reminderDay;
}
