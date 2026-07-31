"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CalendarClock, ListChecks, Repeat2, Save, Tag } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dateTimeLocalValue } from "@/lib/pending-date";
import {
  PENDING_PRIORITIES,
  PENDING_PRIORITY_LABELS,
  PENDING_RECURRENCES,
  PENDING_RECURRENCE_LABELS,
  PENDING_STATUSES,
  PENDING_STATUS_LABELS,
  type PendingPriority,
  type PendingRecurrence,
  type PendingStatus,
} from "@/modules/pendings/domain/pending";

export type PendingFormValues = {
  title: string;
  description: string;
  notes: string;
  status: PendingStatus;
  priority: PendingPriority;
  category: string;
  tags: string[];
  dueDate: string;
  dueTime: string;
  reminderAt: string;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  recurrenceType: PendingRecurrence;
  recurrenceInterval: number;
  recurrenceEndDate: string;
  sourceConversationId: string;
  origin: "manual" | "voice" | "briefing" | "conversation" | "recurrence";
  subtasks: string[];
};

export function PendingForm({
  action,
  initialValues,
  mode,
  pendingId,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialValues: PendingFormValues;
  mode: "create" | "edit";
  pendingId?: string;
  error?: string;
}) {
  const [recurrence, setRecurrence] = useState<PendingRecurrence>(initialValues.recurrenceType);

  return (
    <form action={action} className="space-y-6">
      {pendingId ? <input type="hidden" name="pendingId" value={pendingId} /> : null}
      <input type="hidden" name="sourceConversationId" value={initialValues.sourceConversationId} />
      <input type="hidden" name="origin" value={initialValues.origin} />
      <FormMessage error={error} />

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="nexus-kicker">Compromiso global</div>
        <h2 className="mt-2 text-base font-semibold text-foreground">Definición del pendiente</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Este registro pertenece a tu oficina personal y no se vincula a ningún proyecto.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2"><Label htmlFor="title">Título</Label><Input id="title" name="title" defaultValue={initialValues.title} maxLength={180} required autoFocus={mode === "create"} placeholder="Ej. Enviar reporte mensual" /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="description">Descripción</Label><Textarea id="description" name="description" defaultValue={initialValues.description} maxLength={16_000} className="min-h-32" placeholder="Contexto, resultado esperado o información necesaria." /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="notes">Notas</Label><Textarea id="notes" name="notes" defaultValue={initialValues.notes} maxLength={16_000} className="min-h-24" placeholder="Notas rápidas, contactos o detalles adicionales." /></div>
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3"><div className="grid size-10 place-items-center rounded-xl border border-primary/15 bg-primary/8 text-primary"><CalendarClock className="size-4" /></div><div><div className="nexus-kicker">Planificación</div><h2 className="mt-2 text-base font-semibold">Estado, prioridad y fechas</h2></div></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2"><Label htmlFor="status">Estado</Label><select id="status" name="status" defaultValue={initialValues.status} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm">{PENDING_STATUSES.map((status) => <option key={status} value={status}>{PENDING_STATUS_LABELS[status]}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="priority">Prioridad</Label><select id="priority" name="priority" defaultValue={initialValues.priority} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm">{PENDING_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PENDING_PRIORITY_LABELS[priority]}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="dueDate">Fecha de entrega</Label><Input id="dueDate" name="dueDate" type="date" defaultValue={initialValues.dueDate} /></div>
          <div className="space-y-2"><Label htmlFor="dueTime">Hora opcional</Label><Input id="dueTime" name="dueTime" type="time" defaultValue={initialValues.dueTime} /></div>
          <div className="space-y-2"><Label htmlFor="reminderAt">Recordatorio</Label><Input id="reminderAt" name="reminderAt" type="datetime-local" defaultValue={dateTimeLocalValue(initialValues.reminderAt)} /></div>
          <div className="space-y-2"><Label htmlFor="estimatedMinutes">Tiempo estimado</Label><Input id="estimatedMinutes" name="estimatedMinutes" type="number" min={1} max={10_080} defaultValue={initialValues.estimatedMinutes ?? ""} placeholder="Minutos" /></div>
          {mode === "edit" ? <div className="space-y-2"><Label htmlFor="actualMinutes">Tiempo real</Label><Input id="actualMinutes" name="actualMinutes" type="number" min={0} defaultValue={initialValues.actualMinutes ?? ""} placeholder="Minutos" /></div> : <input type="hidden" name="actualMinutes" value="" />}
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div><div className="flex items-center gap-2"><Tag className="size-4 text-primary" /><h2 className="font-semibold">Organización</h2></div><div className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="category">Categoría</Label><Input id="category" name="category" defaultValue={initialValues.category} maxLength={80} placeholder="General, Trabajo, Finanzas..." /></div><div className="space-y-2"><Label htmlFor="tags">Etiquetas</Label><Input id="tags" name="tags" defaultValue={initialValues.tags.join(", ")} placeholder="reporte, seguimiento, cliente" /></div></div></div>
          <div><div className="flex items-center gap-2"><ListChecks className="size-4 text-primary" /><h2 className="font-semibold">Subpendientes</h2></div><div className="mt-5 space-y-2"><Label htmlFor="subtasks">Uno por línea</Label><Textarea id="subtasks" name="subtasks" defaultValue={initialValues.subtasks.join("\n")} className="min-h-28" placeholder="Reunir datos\nRedactar reporte\nEnviar por correo" /></div></div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3"><Repeat2 className="mt-0.5 size-5 text-primary" /><div><h2 className="font-semibold">Repetición</h2><p className="mt-1 text-sm text-muted-foreground">Al completar el pendiente, NEXUS crea la siguiente ocurrencia sin alterar el historial.</p></div></div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div className="space-y-2"><Label htmlFor="recurrenceType">Frecuencia</Label><select id="recurrenceType" name="recurrenceType" value={recurrence} onChange={(event) => setRecurrence(event.target.value as PendingRecurrence)} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm">{PENDING_RECURRENCES.map((item) => <option key={item} value={item}>{PENDING_RECURRENCE_LABELS[item]}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="recurrenceInterval">Cada</Label><Input id="recurrenceInterval" name="recurrenceInterval" type="number" min={1} max={365} defaultValue={initialValues.recurrenceInterval} disabled={recurrence === "none"} /></div>
          <div className="space-y-2"><Label htmlFor="recurrenceEndDate">Termina el</Label><Input id="recurrenceEndDate" name="recurrenceEndDate" type="date" defaultValue={initialValues.recurrenceEndDate} disabled={recurrence === "none"} /></div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Link href={pendingId ? `/app/pendientes/${pendingId}` : "/app/pendientes"} className={buttonVariants({ variant: "ghost" })}><ArrowLeft />Cancelar</Link><FormSubmitButton pendingLabel="Guardando..."><Save />{mode === "create" ? "Crear pendiente" : "Guardar cambios"}</FormSubmitButton></div>
    </form>
  );
}
