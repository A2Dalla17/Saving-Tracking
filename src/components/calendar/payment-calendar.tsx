"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPaymentsForCalendarMonth,
  getDaysInMonth,
  getFirstDayOfMonth,
  getMonthNameByIndex,
  formatCurrency,
} from "@/lib/calculations";
import { t } from "@/lib/somali";
import type { Payment } from "@/types";

interface PaymentCalendarProps {
  payments: Payment[];
}

const WEEKDAYS = ["Axd", "Isn", "Sal", "Arb", "Kha", "Jim", "Sab"];

export function PaymentCalendar({ payments }: PaymentCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());

  const daysInMonth = getDaysInMonth(year, monthIndex);
  const firstDay = getFirstDayOfMonth(year, monthIndex);
  const calendarPayments = getPaymentsForCalendarMonth(payments, year, monthIndex);

  const paymentsByDay = new Map<number, typeof calendarPayments>();
  for (const cp of calendarPayments) {
    const existing = paymentsByDay.get(cp.day) ?? [];
    existing.push(cp);
    paymentsByDay.set(cp.day, existing);
  }

  const goToPrevMonth = () => {
    if (monthIndex === 0) {
      setMonthIndex(11);
      setYear(year - 1);
    } else {
      setMonthIndex(monthIndex - 1);
    }
  };

  const goToNextMonth = () => {
    if (monthIndex === 11) {
      setMonthIndex(0);
      setYear(year + 1);
    } else {
      setMonthIndex(monthIndex + 1);
    }
  };

  const goToToday = () => {
    setYear(now.getFullYear());
    setMonthIndex(now.getMonth());
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Card className="calendar-accent-card animate-fade-in-up overflow-hidden">
      <CardHeader className="calendar-card-header rounded-t-2xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {getMonthNameByIndex(monthIndex)} {year}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="calendar-nav-btn" onClick={goToPrevMonth}>
              {t.calendar.prevMonth}
            </button>
            <button type="button" className="calendar-nav-btn calendar-nav-btn-primary" onClick={goToToday}>
              {t.calendar.today}
            </button>
            <button type="button" className="calendar-nav-btn" onClick={goToNextMonth}>
              {t.calendar.nextMonth}
            </button>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          {getMonthNameByIndex(monthIndex)} 1 — {getMonthNameByIndex(monthIndex)} {daysInMonth}
        </p>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="calendar-day rounded-lg" />;
            }

            const dayPayments = paymentsByDay.get(day) ?? [];
            const isToday =
              day === now.getDate() && monthIndex === now.getMonth() && year === now.getFullYear();

            return (
              <div
                key={day}
                className={`calendar-day rounded-lg border p-1.5 ${
                  dayPayments.length > 0 ? "has-payment" : ""
                } ${isToday ? "is-today" : ""}`}
              >
                <div className="calendar-day-number mb-1">
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayPayments.map((cp) => (
                    <div
                      key={cp.payment.id}
                      className="calendar-payment-pill text-[10px] leading-tight rounded px-1 py-0.5"
                      title={`${cp.payment.memberName} — ${cp.time} — ${formatCurrency(cp.payment.amount)}`}
                    >
                      <span className="font-semibold">{cp.payment.memberName.split(" ")[0]}</span>
                      <br />
                      <span className="text-card-foreground">{cp.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {calendarPayments.length > 0 && (
          <div className="mt-6 space-y-2 border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-card-foreground">Faahfaahinta Bishan</h4>
            {calendarPayments.map((cp) => (
              <div key={cp.payment.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <div>
                  <span className="font-medium text-card-foreground">{cp.payment.memberName}</span>
                  <span className="text-muted-foreground">
                    {" "}{t.calendar.paidOn} {cp.day} {getMonthNameByIndex(monthIndex)} {t.calendar.at} {cp.time}
                  </span>
                </div>
                <span className="font-mono-currency font-semibold text-card-foreground">
                  {formatCurrency(cp.payment.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
