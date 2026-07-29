import type { Metadata } from "next";
import Link from "next/link";
import { Archive, CircleCheckBig, ClipboardList, Plus, Search, TimerReset } from "lucide-react";

import { TaskCard } from "@/components/tasks/task-card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadTaskBoard } from "@/modules/tasks/application/task-queries";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/modules/tasks/domain/task";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Tareas" };

type Props = {
  searchParams: Promise<{ project?: string; q?: string; archived?: string }>;
};

const columns: Array<{ status: TaskStatus; description: string }> = [
  { status: "backlog", description: "Trabajo preparado" },
  { status: "in_progress", description: "Ejecución activa" },
  { status: "review", description: "Pendiente de validación" },
  { status: "completed", description: "Criterios cumplidos" },
];

export default async function TasksPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, membership } = await requireCurrentWorkspace();
  const [tasks, projectResult] = await Promise.all([
    loadTaskBoard(supabase, membership.workspaceId, {
      projectId: params.project,
      query: params.q,
      includeArchived: params.archived === "1",
    }),
    supabase.from("projects").select("id, name").eq("workspace_id", membership.workspaceId).neq("status", "archived").order("name"),
  ]);
  const cancelled = tasks.filter((task) => task.status === "cancelled" || task.status === "archived").length;

  return (
    <div className="mx-auto max-w-[100rem] pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="nexus-kicker">Gestión profesional</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">Tareas del workspace</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Convierte conversaciones en trabajo verificable con responsables, dependencias, criterios de aceptación y artefactos relacionados.</p>
        </div>
        <Link href="/app/tareas/nueva" className={buttonVariants({ size: "lg" })}><Plus />Nueva tarea</Link>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <article className="nexus-panel rounded-2xl p-5"><ClipboardList className="size-4 text-primary/70" /><div className="mt-4 text-2xl font-semibold text-white">{tasks.length}</div><div className="mt-1 text-xs text-slate-600">Tareas recuperadas</div></article>
        <article className="nexus-panel rounded-2xl p-5"><TimerReset className="size-4 text-cyan-300/70" /><div className="mt-4 text-2xl font-semibold text-white">{tasks.filter((task) => task.status === "in_progress" || task.status === "review").length}</div><div className="mt-1 text-xs text-slate-600">En ejecución o revisión</div></article>
        <article className="nexus-panel rounded-2xl p-5"><CircleCheckBig className="size-4 text-emerald-300/70" /><div className="mt-4 text-2xl font-semibold text-white">{tasks.filter((task) => task.status === "completed").length}</div><div className="mt-1 text-xs text-slate-600">Completadas · {cancelled} detenidas</div></article>
      </section>

      <form className="nexus-panel mt-5 grid gap-3 rounded-2xl p-4 md:grid-cols-[minmax(0,1fr)_18rem_auto_auto]">
        <div className="relative"><Search className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-slate-600" /><Input name="q" defaultValue={params.q} placeholder="Buscar tarea..." className="pl-10" /></div>
        <select name="project" defaultValue={params.project ?? ""} className="nexus-focus h-11 rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"><option value="">Todos los proyectos</option>{(projectResult.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-input bg-white/[0.02] px-3 text-xs text-slate-500"><input type="checkbox" name="archived" value="1" defaultChecked={params.archived === "1"} className="accent-[#55e6c1]" /><Archive className="size-3.5" />Incluir archivadas</label>
        <button className={buttonVariants({ variant: "secondary" })}>Aplicar</button>
      </form>

      <section className="mt-5 grid items-start gap-4 xl:grid-cols-4">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          return (
            <article key={column.status} className="rounded-2xl border border-white/[0.055] bg-white/[0.012] p-3">
              <header className="flex items-center justify-between px-1 py-2"><div><h2 className="text-sm font-semibold text-slate-200">{TASK_STATUS_LABELS[column.status]}</h2><p className="mt-1 text-[0.65rem] text-slate-600">{column.description}</p></div><span className="rounded-full border border-white/[0.06] px-2 py-1 font-mono text-[0.6rem] text-slate-600">{columnTasks.length}</span></header>
              <div className="mt-2 space-y-3">{columnTasks.map((task) => <TaskCard key={task.id} task={task} />)}{!columnTasks.length ? <div className="rounded-xl border border-dashed border-white/[0.06] p-5 text-center text-xs text-slate-700">Sin tareas</div> : null}</div>
            </article>
          );
        })}
      </section>

      {cancelled > 0 ? (
        <section className="mt-4 rounded-2xl border border-white/[0.055] bg-white/[0.012] p-3">
          <header className="flex items-center justify-between px-1 py-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-300">Detenidas y archivadas</h2>
              <p className="mt-1 text-[0.65rem] text-slate-600">Se conserva su trazabilidad completa</p>
            </div>
            <span className="rounded-full border border-white/[0.06] px-2 py-1 font-mono text-[0.6rem] text-slate-600">{cancelled}</span>
          </header>
          <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {tasks
              .filter((task) => task.status === "cancelled" || task.status === "archived")
              .map((task) => <TaskCard key={task.id} task={task} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
