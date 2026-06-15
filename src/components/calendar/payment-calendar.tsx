"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <Card className="animate-fade-in-up overflow-hidden">
      <CardHeader className="brand-gradient text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-white flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-gold" />
            {getMonthNameByIndex(monthIndex)} {year}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setYear(year - 1)} className="text-white hover:bg-white/20">
              {t.calendar.prevYear}
            </Button>
            <Button variant="ghost" size="icon" onClick={goToPrevMonth} className="text-white hover:bg-white/20">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday} className="text-gold hover:bg-white/20 font-semibold">
              {t.calendar.today}
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNextMonth} className="text-white hover:bg-white/20">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setYear(year + 1)} className="text-white hover:bg-white/20">
              {t.calendar.nextYear}
            </Button>
          </div>
        </div>
        <p className="text-white/70 text-sm mt-1">
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
                className={`calendar-day rounded-lg border border-border p-1.5 ${
                  dayPayments.length > 0 ? "has-payment" : ""
                } ${isToday ? "ring-2 ring-brand animate-pulse-glow" : ""}`}
              >
                <div className={`text-xs font-semibold mb-1 ${isToday ? "text-brand" : "text-muted-foreground"}`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayPayments.map((cp) => (
                    <div
                      key={cp.payment.id}
                      className="text-[10px] leading-tight bg-brand/10 text-brand rounded px-1 py-0.5"
                      title={`${cp.payment.memberName} — ${cp.time} — ${formatCurrency(cp.payment.amount)}`}
                    >
                      <span className="font-semibold">{cp.payment.memberName.split(" ")[0]}</span>
                      <br />
                      <span className="text-muted-foreground">{cp.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {calendarPayments.length > 0 && (
          <div className="mt-6 space-y-2 border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-brand">Faahfaahinta Bishan</h4>
            {calendarPayments.map((cp) => (
              <div key={cp.payment.id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                <div>
                  <span className="font-medium text-foreground">{cp.payment.memberName}</span>
                  <span className="text-muted-foreground">
                    {" "}{t.calendar.paidOn} {cp.day} {getMonthNameByIndex(monthIndex)} {t.calendar.at} {cp.time}
                  </span>
                </div>
                <span className="font-mono-currency font-semibold text-brand">
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
