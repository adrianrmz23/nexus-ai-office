import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, Boxes, CalendarClock, CheckCircle2, CirclePlay, Edit3, Eye, GitMerge, MessageSquareText, UserRound } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { MessageMarkdown } from "@/components/conversations/message-markdown";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { loadArtifactList } from "@/modules/artifacts/application/artifact-queries";
import { setTaskStatus } from "@/modules/tasks/application/task-actions";
import { loadTaskById } from "@/modules/tasks/application/task-queries";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/modules/tasks/domain/task";
import { taskIdSchema } from "@/modules/tasks/domain/task-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Detalle de tarea" };

type Props = { params: Promise<{ taskId: string }>; searchParams: Promise<{ error?: string; success?: string }> };

export default async function TaskDetailPage({ params, searchParams }: Props) {
  const { taskId } = await params;
  const messages = await searchParams;
  const parsed = taskIdSchema.safeParse(taskId);
  if (!parsed.success) return notFound();
  const { supabase, membership } = await requireCurrentWorkspace();
  const task = await loadTaskById(supabase, membership.workspaceId, parsed.data);
  if (!task) return notFound();
  const taskRecord = task;
  const artifacts = (await loadArtifactList(supabase, membership.workspaceId, { projectId: taskRecord.project_id })).filter((artifact) => artifact.task_id === taskRecord.id);

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <Link href="/app/tareas" className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft />Volver a tareas</Link>
      <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div><div className="nexus-kicker">{taskRecord.project?.name}</div><h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-white">{taskRecord.title}</h1><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-primary/10 bg-primary/[0.04] px-2.5 py-1 text-primary/75">{TASK_STATUS_LABELS[taskRecord.status]}</span><span className="rounded-full border border-white/[0.06] px-2.5 py-1 text-slate-500">Prioridad {TASK_PRIORITY_LABELS[taskRecord.priority].toLowerCase()}</span><span className="rounded-full border border-white/[0.06] px-2.5 py-1 text-slate-500">{taskRecord.progress}%</span></div></div>
        <div className="flex flex-wrap gap-2"><Link href={`/app/tareas/${taskRecord.id}/editar`} className={buttonVariants({ variant: "outline" })}><Edit3 />Editar</Link><Link href={`/app/artefactos/nuevo?project=${taskRecord.project_id}&task=${taskRecord.id}`} className={buttonVariants()}><Boxes />Crear artefacto</Link></div>
      </div>
      <div className="mt-7"><FormMessage error={messages.error} success={messages.success} /></div>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <article className="nexus-panel rounded-2xl p-5 sm:p-6"><div className="nexus-kicker">Alcance</div><h2 className="mt-2 text-base font-semibold text-slate-100">Descripción</h2><div className="mt-4"><MessageMarkdown content={taskRecord.description || "Sin descripción."} /></div>{taskRecord.acceptance_criteria ? <><h2 className="mt-7 border-t border-white/[0.055] pt-5 text-base font-semibold text-slate-100">Criterios de aceptación</h2><div className="mt-4"><MessageMarkdown content={taskRecord.acceptance_criteria} /></div></> : null}</article>
        <aside className="space-y-3">
          <article className="nexus-panel rounded-2xl p-5"><div className="flex items-center gap-2 text-xs text-slate-500"><UserRound className="size-4 text-primary/65" />Responsable</div><div className="mt-3 text-sm font-medium text-slate-200">{taskRecord.assignedAgent?.name ?? "Sin asignar"}</div></article>
          <article className="nexus-panel rounded-2xl p-5"><div className="flex items-center gap-2 text-xs text-slate-500"><CalendarClock className="size-4 text-primary/65" />Fecha objetivo</div><div className="mt-3 text-sm font-medium text-slate-200">{taskRecord.due_date ?? "Sin fecha"}</div></article>
          {taskRecord.conversation_id ? <Link href={`/app/conversaciones/${taskRecord.conversation_id}`} className="nexus-panel flex items-center gap-3 rounded-2xl p-5 text-sm text-slate-300 hover:border-primary/20"><MessageSquareText className="size-4 text-primary/70" />Abrir conversación de origen</Link> : null}
        </aside>
      </section>

      <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-2"><GitMerge className="size-4 text-primary/70" /><div className="nexus-kicker">Dependencias</div></div>{taskRecord.dependencies?.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{taskRecord.dependencies.map((dependency) => <Link key={dependency.id} href={`/app/tareas/${dependency.id}`} className="rounded-xl border border-white/[0.055] p-4"><div className="text-sm text-slate-200">{dependency.title}</div><div className="mt-1 text-xs text-slate-600">{TASK_STATUS_LABELS[dependency.status]}</div></Link>)}</div> : <p className="mt-4 text-sm text-slate-600">Esta tarea no depende de otra.</p>}</section>

      <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><div className="nexus-kicker">Entregables</div><h2 className="mt-2 text-base font-semibold text-slate-100">Artefactos vinculados</h2></div><span className="font-mono text-xs text-primary">{artifacts.length}</span></div>{artifacts.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{artifacts.map((artifact) => <Link key={artifact.id} href={`/app/artefactos/${artifact.id}`} className="rounded-xl border border-white/[0.055] p-4"><div className="text-sm font-medium text-slate-200">{artifact.title}</div><div className="mt-2 text-xs text-slate-600">v{artifact.current_version_number} · {artifact.status}</div></Link>)}</div> : <p className="mt-4 text-sm text-slate-600">Todavía no hay artefactos relacionados.</p>}</section>

      <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6"><div className="nexus-kicker">Control operativo</div><div className="mt-4 flex flex-wrap gap-2">
        {taskRecord.status !== "in_progress" ? <form action={setTaskStatus}><input type="hidden" name="taskId" value={taskRecord.id} /><input type="hidden" name="status" value="in_progress" /><FormSubmitButton variant="secondary"><CirclePlay />Iniciar</FormSubmitButton></form> : null}
        {taskRecord.status !== "review" ? <form action={setTaskStatus}><input type="hidden" name="taskId" value={taskRecord.id} /><input type="hidden" name="status" value="review" /><FormSubmitButton variant="outline"><Eye />Enviar a revisión</FormSubmitButton></form> : null}
        {taskRecord.status !== "completed" ? <form action={setTaskStatus}><input type="hidden" name="taskId" value={taskRecord.id} /><input type="hidden" name="status" value="completed" /><FormSubmitButton><CheckCircle2 />Completar</FormSubmitButton></form> : null}
        {taskRecord.status !== "archived" ? <form action={setTaskStatus}><input type="hidden" name="taskId" value={taskRecord.id} /><input type="hidden" name="status" value="archived" /><ConfirmSubmitButton variant="ghost" confirmationMessage="¿Archivar esta tarea? Sus artefactos y trazabilidad se conservarán."><Archive />Archivar</ConfirmSubmitButton></form> : null}
      </div></section>
    </div>
  );
}
