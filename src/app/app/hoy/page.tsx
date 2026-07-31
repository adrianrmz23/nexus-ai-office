import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Boxes, CalendarCheck2, CheckCircle2, CircleAlert, ListTodo, Plus, Sparkles } from "lucide-react";

import { PendingCard } from "@/components/pendings/pending-card";
import { DailyBriefing } from "@/components/today/daily-briefing";
import { VoiceCommandCenter } from "@/components/voice/voice-command-center";
import { buttonVariants } from "@/components/ui/button";
import { getIsoTimestampDaysAgo, getServerNow } from "@/lib/server-date";
import { todayDateString, loadPendingList, loadVoiceSettings } from "@/modules/pendings/application/pending-queries";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Hoy" };

export default async function TodayPage() {
  const { supabase, membership, user } = await requireCurrentWorkspace();
  const voiceSettings = await loadVoiceSettings(supabase, membership.workspaceId, user.id);
  const today = todayDateString(getServerNow(), voiceSettings.time_zone);
  const pendings = await loadPendingList(supabase, membership.workspaceId, user.id, { status: "active", timeZone: voiceSettings.time_zone });
  const [taskResult, artifactResult, failedRunResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_date, status, priority, project_id, projects(name)")
      .eq("workspace_id", membership.workspaceId)
      .in("status", ["backlog", "in_progress", "review"])
      .or(`due_date.lte.${today},status.eq.review`)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(20),
    supabase
      .from("artifacts")
      .select("id, title, status, project_id, projects(name)")
      .eq("workspace_id", membership.workspaceId)
      .in("status", ["in_review", "changes_requested"])
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("agent_runs")
      .select("id, status, error_message, conversation_id, created_at")
      .eq("workspace_id", membership.workspaceId)
      .in("status", ["failed", "cancelled"])
      .gte("created_at", getIsoTimestampDaysAgo(1))
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  type TodayTask = { id: string; title: string; due_date: string | null; status: string; priority: string; project_id: string; projects: { name: string } | Array<{ name: string }> | null };
  type TodayArtifact = { id: string; title: string; status: string; project_id: string; projects: { name: string } | Array<{ name: string }> | null };
  type FailedRun = { id: string; status: string; error_message: string | null; conversation_id: string | null; created_at: string };
  const activePendings = pendings.filter((item) => !["completed", "cancelled", "archived"].includes(item.status) && item.priorityScore >= 0);
  const overduePendings = activePendings.filter((item) => item.due_date && item.due_date < today);
  const todayPendings = activePendings.filter((item) => item.due_date === today);
  const topPriorities = activePendings.filter((item) => item.priorityScore >= 0).slice(0, 5);
  const tasks = (taskResult.data ?? []) as unknown as TodayTask[];
  const overdueTasks = tasks.filter((task) => task.due_date && task.due_date < today);
  const reviewTasks = tasks.filter((task) => task.status === "review");
  const artifacts = (artifactResult.data ?? []) as unknown as TodayArtifact[];
  const failedRuns = (failedRunResult.data ?? []) as unknown as FailedRun[];

  const briefingText = [
    `Buenos días. Tienes ${todayPendings.length} pendientes personales para hoy y ${overduePendings.length} vencidos.`,
    tasks.length ? `Hay ${tasks.length} tareas de proyectos que requieren atención, incluyendo ${reviewTasks.length} en revisión y ${overdueTasks.length} vencidas.` : "No hay tareas de proyectos urgentes registradas.",
    artifacts.length ? `${artifacts.length} artefactos esperan revisión o cambios.` : "No hay artefactos esperando revisión.",
    failedRuns.length ? `${failedRuns.length} ejecuciones de agentes fallaron o fueron canceladas durante las últimas veinticuatro horas.` : "Las ejecuciones recientes no presentan alertas.",
    topPriorities[0] ? `Tu prioridad principal es: ${topPriorities[0].title}.` : "No tienes pendientes personales activos.",
  ].join(" ");

  return (
    <div className="mx-auto max-w-[96rem] pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><div className="nexus-kicker">Centro de atención</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Hoy en NEXUS</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Reúne pendientes personales, tareas de proyectos, revisiones y alertas sin mezclar sus datos.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/app/pendientes/nuevo" className={buttonVariants()}><Plus />Capturar pendiente</Link><Link href="/app/pendientes" className={buttonVariants({ variant: "outline" })}>Abrir agenda <ArrowRight /></Link></div>
      </div>

      <div className="mt-7"><DailyBriefing text={briefingText} /></div>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="nexus-panel rounded-2xl p-5"><CalendarCheck2 className="size-4 text-primary" /><div className="mt-4 text-2xl font-semibold">{todayPendings.length}</div><div className="mt-1 text-xs text-muted-foreground">Pendientes para hoy</div></article>
        <article className="nexus-panel rounded-2xl p-5"><CircleAlert className="size-4 text-rose-500" /><div className="mt-4 text-2xl font-semibold">{overduePendings.length + overdueTasks.length}</div><div className="mt-1 text-xs text-muted-foreground">Compromisos vencidos</div></article>
        <article className="nexus-panel rounded-2xl p-5"><ListTodo className="size-4 text-amber-500" /><div className="mt-4 text-2xl font-semibold">{reviewTasks.length}</div><div className="mt-1 text-xs text-muted-foreground">Tareas en revisión</div></article>
        <article className="nexus-panel rounded-2xl p-5"><Boxes className="size-4 text-violet-500" /><div className="mt-4 text-2xl font-semibold">{artifacts.length}</div><div className="mt-1 text-xs text-muted-foreground">Artefactos por revisar</div></article>
      </section>

      <div className="mt-5"><VoiceCommandCenter /></div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><div className="nexus-kicker">Qué atender primero</div><h2 className="mt-2 text-lg font-semibold">Prioridades personales</h2></div><Sparkles className="size-5 text-primary" /></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">{topPriorities.map((pending) => <PendingCard key={pending.id} pending={pending} compact today={today} />)}{!topPriorities.length ? <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No hay pendientes activos.</div> : null}</div>
        </section>

        <section className="space-y-4">
          <article className="nexus-panel rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-2"><ListTodo className="size-4 text-primary" /><div><div className="nexus-kicker">Proyectos</div><h2 className="mt-1 font-semibold">Tareas que requieren atención</h2></div></div><div className="mt-4 space-y-2">{tasks.slice(0, 6).map((task) => { const project = Array.isArray(task.projects) ? task.projects[0] : task.projects; return <Link key={task.id} href={`/app/tareas/${task.id}`} className="block rounded-xl border border-border bg-muted/20 p-3.5"><div className="text-sm font-medium">{task.title}</div><div className="mt-1 text-xs text-muted-foreground">{project?.name ?? "Proyecto"} · {task.status === "review" ? "En revisión" : task.due_date ?? "Sin fecha"}</div></Link>; })}{!tasks.length ? <p className="text-sm text-muted-foreground">No hay tareas urgentes.</p> : null}</div></article>

          <article className="nexus-panel rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-2"><AlertTriangle className="size-4 text-rose-500" /><div><div className="nexus-kicker">Alertas</div><h2 className="mt-1 font-semibold">Ejecuciones recientes</h2></div></div><div className="mt-4 space-y-2">{failedRuns.map((run) => <Link key={run.id} href={run.conversation_id ? `/app/conversaciones/${run.conversation_id}` : "/app/conversaciones"} className="block rounded-xl border border-rose-400/15 bg-rose-400/[0.035] p-3 text-sm"><div className="font-medium">Ejecución {run.status}</div><div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{run.error_message ?? "Sin detalle adicional"}</div></Link>)}{!failedRuns.length ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-primary" />Sin alertas operativas en las últimas 24 horas.</div> : null}</div></article>
        </section>
      </div>

      {artifacts.length ? <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6"><div className="nexus-kicker">Revisión humana</div><h2 className="mt-2 font-semibold">Artefactos pendientes</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{artifacts.map((artifact) => { const project = Array.isArray(artifact.projects) ? artifact.projects[0] : artifact.projects; return <Link key={artifact.id} href={`/app/artefactos/${artifact.id}`} className="rounded-xl border border-border bg-muted/20 p-4"><div className="font-medium">{artifact.title}</div><div className="mt-2 text-xs text-muted-foreground">{project?.name ?? "Proyecto"} · {artifact.status}</div></Link>; })}</div></section> : null}
    </div>
  );
}
