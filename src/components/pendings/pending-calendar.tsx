"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PendingRecord } from "@/modules/pendings/domain/pending";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isLeapYear(year: number): boolean {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 1) return isLeapYear(year) ? 29 : 28;
  return [3, 5, 8, 10].includes(month) ? 30 : 31;
}

function mondayOffset(year: number, month: number): number {
  // Algoritmo de Sakamoto. Devuelve domingo=0; se normaliza a lunes=0.
  const offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let adjustedYear = year;
  if (month < 2) adjustedYear -= 1;
  const sundayBased = (adjustedYear + Math.floor(adjustedYear / 4) - Math.floor(adjustedYear / 100) + Math.floor(adjustedYear / 400) + offsets[month] + 1) % 7;
  return (sundayBased + 6) % 7;
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const absolute = year * 12 + month + delta;
  return { year: Math.floor(absolute / 12), month: ((absolute % 12) + 12) % 12 };
}

export function PendingCalendar({ pendings, today }: { pendings: PendingRecord[]; today: string }) {
  const initialYear = Number(today.slice(0, 4));
  const initialMonth = Number(today.slice(5, 7)) - 1;
  const [visible, setVisible] = useState({ year: initialYear, month: initialMonth });

  const cells = useMemo(() => {
    const offset = mondayOffset(visible.year, visible.month);
    const days = daysInMonth(visible.year, visible.month);
    const previous = shiftMonth(visible.year, visible.month, -1);
    const previousDays = daysInMonth(previous.year, previous.month);
    return Array.from({ length: 42 }, (_, index) => {
      const rawDay = index - offset + 1;
      let year = visible.year;
      let month = visible.month;
      let day = rawDay;
      let currentMonth = true;
      if (rawDay < 1) {
        month -= 1;
        if (month < 0) { month = 11; year -= 1; }
        day = previousDays + rawDay;
        currentMonth = false;
      } else if (rawDay > days) {
        month += 1;
        if (month > 11) { month = 0; year += 1; }
        day = rawDay - days;
        currentMonth = false;
      }
      const date = isoDate(year, month, day);
      return { date, day, currentMonth, items: pendings.filter((item) => item.due_date === date) };
    });
  }, [pendings, visible]);

  const move = (delta: number) => {
    setVisible((current) => shiftMonth(current.year, current.month, delta));
  };

  return (
    <section className="nexus-panel mt-5 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={() => move(-1)} title="Mes anterior"><ChevronLeft /></Button>
        <h2 className="text-base font-semibold capitalize">{MONTHS[visible.month]} {visible.year}</h2>
        <Button type="button" variant="ghost" size="icon" onClick={() => move(1)} title="Mes siguiente"><ChevronRight /></Button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {WEEKDAYS.map((day) => <div key={day} className="bg-muted/70 px-2 py-2 text-center font-mono text-[0.58rem] tracking-wider text-muted-foreground uppercase">{day}</div>)}
        {cells.map((cell) => (
          <div key={cell.date} className={cn("min-h-28 bg-card p-2", !cell.currentMonth && "bg-muted/30 text-muted-foreground/50")}>
            <div className={cn("grid size-7 place-items-center rounded-full text-xs", cell.date === today && "bg-primary font-semibold text-primary-foreground")}>{cell.day}</div>
            <div className="mt-2 space-y-1">
              {cell.items.slice(0, 3).map((item) => (
                <Link key={item.id} href={`/app/pendientes/${item.id}`} title={item.title} className={cn("block truncate rounded-md border px-1.5 py-1 text-[0.63rem]", item.priority === "urgent" ? "border-rose-400/25 bg-rose-400/[0.06] text-rose-600 dark:text-rose-300" : "border-primary/12 bg-primary/[0.035] text-foreground")}>{item.title}</Link>
              ))}
              {cell.items.length > 3 ? <div className="px-1 text-[0.6rem] text-muted-foreground">+{cell.items.length - 3} más</div> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
