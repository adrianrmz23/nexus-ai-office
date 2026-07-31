import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, CalendarClock, CheckCircle2, CirclePlay, Clock3, Edit3, PauseCircle, Repeat2, Tags } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { VoiceReader } from "@/components/voice/voice-reader";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { formatPendingDate } from "@/lib/pending-date";
import { setPendingStatus, snoozePending, togglePendingSubtask } from "@/modules/pendings/application/pending-actions";
import { loadPendingById } from "@/modules/pendings/application/pending-queries";
import { PENDING_PRIORITY_LABELS, PENDING_RECURRENCE_LABELS, PENDING_STATUS_LABELS } from "@/modules/pendings/domain/pending";
import { pendingIdSchema } from "@/modules/pendings/domain/pending-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Detalle de pendiente" };

type Props = { params: Promise<{ pendingId: string }>; searchParams: Promise<{ error?: string; success?: string }> };

export default async function PendingDetailPage({ params, searchParams }: Props) {
  const { pendingId } = await params;
  const messages = await searchParams;
  const parsed = pendingIdSchema.safeParse(pendingId);
  if (!parsed.success) return notFound();
  const { supabase, membership, user } = await requireCurrentWorkspace();
  const pending = await loadPendingById(supabase, membership.workspaceId, user.id, parsed.data);
  if (!pending) return notFound();
  const voiceText = `${pending.title}. ${pending.description}. Estado ${PENDING_STATUS_LABELS[pending.status]}. Prioridad ${PENDING_PRIORITY_LABELS[pending.priority]}. Fecha ${formatPendingDate(pending.due_date, pending.due_time)}. ${pending.notes}`;

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <Link href="/app/pendientes" className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft />Volver a pendientes</Link>
      <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div><div className="nexus-kicker">{pending.category}</div><h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.035em]">{pending.title}</h1><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-primary/15 bg-primary/[0.04] px-2.5 py-1 text-primary">{PENDING_STATUS_LABELS[pending.status]}</span><span className="rounded-full border border-border px-2.5 py-1">Prioridad {PENDING_PRIORITY_LABELS[pending.priority].toLowerCase()}</span><span className="rounded-full border border-border px-2.5 py-1">Puntuación {Math.max(0, pending.priorityScore)}</span></div></div>
        <div className="flex flex-wrap gap-2"><VoiceReader text={voiceText} label="Escuchar pendiente" /><Link href={`/app/pendientes/${pending.id}/editar`} className={buttonVariants({ variant: "outline" })}><Edit3 />Editar</Link></div>
      </div>
      <div className="mt-6"><FormMessage error={messages.error} success={messages.success} /></div>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_21rem]">
        <article className="nexus-panel rounded-2xl p-5 sm:p-6"><div className="nexus-kicker">Alcance</div><h2 className="mt-2 font-semibold">Descripción</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{pending.description || "Sin descripción."}</p>{pending.notes ? <><h2 className="mt-7 border-t border-border pt-5 font-semibold">Notas</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{pending.notes}</p></> : null}</article>
        <aside className="space-y-3">
          <article className="nexus-panel rounded-2xl p-5"><div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock className="size-4 text-primary" />Entrega</div><div className="mt-3 text-sm font-medium">{formatPendingDate(pending.due_date, pending.due_time)}</div></article>
          <article className="nexus-panel rounded-2xl p-5"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-4 text-primary" />Tiempo</div><div className="mt-3 text-sm font-medium">{pending.estimated_minutes ? `${pending.estimated_minutes} min estimados` : "Sin estimación"}{pending.actual_minutes !== null ? ` · ${pending.actual_minutes} min reales` : ""}</div></article>
          <article className="nexus-panel rounded-2xl p-5"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Repeat2 className="size-4 text-primary" />Repetición</div><div className="mt-3 text-sm font-medium">{PENDING_RECURRENCE_LABELS[pending.recurrence_type]}</div></article>
          {pending.tags.length ? <article className="nexus-panel rounded-2xl p-5"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Tags className="size-4 text-primary" />Etiquetas</div><div className="mt-3 flex flex-wrap gap-2">{pending.tags.map((tag) => <span key={tag} className="rounded-full border border-border px-2 py-1 text-xs">{tag}</span>)}</div></article> : null}
        </aside>
      </section>

      <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="nexus-kicker">Desglose</div><h2 className="mt-2 font-semibold">Subpendientes</h2></div><span className="font-mono text-xs text-primary">{pending.subtasks.filter((item) => item.is_completed).length}/{pending.subtasks.length}</span></div>{pending.subtasks.length ? <div className="mt-5 space-y-2">{pending.subtasks.map((subtask) => <form key={subtask.id} action={togglePendingSubtask}><input type="hidden" name="pendingId" value={pending.id} /><input type="hidden" name="subtaskId" value={subtask.id} /><input type="hidden" name="isCompleted" value={String(subtask.is_completed)} /><button className="nexus-focus flex w-full items-center gap-3 rounded-xl border border-border bg-muted/25 p-3.5 text-left"><span className={`grid size-5 place-items-center rounded border ${subtask.is_completed ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{subtask.is_completed ? <CheckCircle2 className="size-3.5" /> : null}</span><span className={subtask.is_completed ? "text-muted-foreground line-through" : "text-foreground"}>{subtask.title}</span></button></form>)}</div> : <p className="mt-4 text-sm text-muted-foreground">No hay subpendientes.</p>}</section>

      <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6"><div className="nexus-kicker">Control operativo</div><div className="mt-4 flex flex-wrap gap-2">
        {pending.status !== "in_progress" ? <form action={setPendingStatus}><input type="hidden" name="pendingId" value={pending.id} /><input type="hidden" name="status" value="in_progress" /><FormSubmitButton variant="secondary"><CirclePlay />Iniciar</FormSubmitButton></form> : null}
        {pending.status !== "waiting" ? <form action={setPendingStatus}><input type="hidden" name="pendingId" value={pending.id} /><input type="hidden" name="status" value="waiting" /><FormSubmitButton variant="outline"><PauseCircle />En espera</FormSubmitButton></form> : null}
        {pending.status !== "completed" ? <form action={setPendingStatus}><input type="hidden" name="pendingId" value={pending.id} /><input type="hidden" name="status" value="completed" /><FormSubmitButton><CheckCircle2 />Completar</FormSubmitButton></form> : null}
        {pending.status !== "archived" ? <form action={setPendingStatus}><input type="hidden" name="pendingId" value={pending.id} /><input type="hidden" name="status" value="archived" /><ConfirmSubmitButton variant="ghost" confirmationMessage="¿Archivar este pendiente? La trazabilidad se conservará."><Archive />Archivar</ConfirmSubmitButton></form> : null}
      </div>
      {!(["completed", "cancelled", "archived"] as string[]).includes(pending.status) ? <form action={snoozePending} className="mt-5 flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-end"><input type="hidden" name="pendingId" value={pending.id} /><div className="flex-1 space-y-2"><label htmlFor="snoozedUntil" className="text-xs font-medium">Posponer hasta</label><Input id="snoozedUntil" name="snoozedUntil" type="datetime-local" required /></div><FormSubmitButton variant="outline"><Clock3 />Posponer</FormSubmitButton></form> : null}
      </section>
    </div>
  );
}
