"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Link2, Save, UserRoundCog } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskAgentOption,
  type TaskDependencyOption,
  type TaskPriority,
  type TaskProjectOption,
  type TaskStatus,
} from "@/modules/tasks/domain/task";

type TaskFormValues = {
  projectId: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  dueDate: string;
  assignedAgentId: string;
  conversationId: string;
  sourceMessageId: string;
  createdByAgentId: string;
  dependencyIds: string[];
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  projects: TaskProjectOption[];
  agents: TaskAgentOption[];
  dependencies: TaskDependencyOption[];
  initialValues: TaskFormValues;
  mode: "create" | "edit";
  taskId?: string;
  error?: string;
};

export function TaskForm({
  action,
  projects,
  agents,
  dependencies,
  initialValues,
  mode,
  taskId,
  error,
}: Props) {
  const [projectId, setProjectId] = useState(initialValues.projectId || projects[0]?.id || "");
  const projectAgents = useMemo(
    () => agents.filter((agent) => agent.projectIds.includes(projectId)),
    [agents, projectId],
  );
  const projectTasks = useMemo(
    () => dependencies.filter((task) => task.projectId === projectId && task.id !== taskId),
    [dependencies, projectId, taskId],
  );
  const selectedDependencies = new Set(initialValues.dependencyIds);

  return (
    <form action={action} className="space-y-6">
      {taskId ? <input type="hidden" name="taskId" value={taskId} /> : null}
      <input type="hidden" name="conversationId" value={initialValues.conversationId} />
      <input type="hidden" name="sourceMessageId" value={initialValues.sourceMessageId} />
      <input type="hidden" name="createdByAgentId" value={initialValues.createdByAgentId} />

      <FormMessage error={error} />

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="nexus-kicker">Trabajo verificable</div>
        <h2 className="mt-2 text-base font-semibold text-slate-100">Definición de la tarea</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Cada tarea conserva proyecto, agente, conversación de origen, dependencias y criterios de aceptación.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="projectId">Proyecto</Label>
            <select
              id="projectId"
              name="projectId"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              disabled={mode === "edit"}
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"
              required
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            {mode === "edit" ? <input type="hidden" name="projectId" value={projectId} /> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedAgentId">Agente responsable</Label>
            <select
              id="assignedAgentId"
              name="assignedAgentId"
              defaultValue={initialValues.assignedAgentId}
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"
            >
              <option value="">Sin asignar</option>
              {projectAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" defaultValue={initialValues.title} maxLength={180} required autoFocus={mode === "create"} placeholder="Ej. Implementar selector de variantes" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" defaultValue={initialValues.description} maxLength={20_000} className="min-h-40" placeholder="Describe el alcance, contexto y resultado esperado." />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="acceptanceCriteria">Criterios de aceptación</Label>
            <Textarea id="acceptanceCriteria" name="acceptanceCriteria" defaultValue={initialValues.acceptanceCriteria} maxLength={12_000} className="min-h-32" placeholder="Un criterio verificable por línea." />
          </div>
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-xl border border-primary/10 bg-primary/[0.04]"><CalendarDays className="size-4 text-primary/75" /></div>
          <div>
            <div className="nexus-kicker">Planificación</div>
            <h2 className="mt-2 text-base font-semibold text-slate-100">Estado, prioridad y avance</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <select id="status" name="status" defaultValue={initialValues.status} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground">
              {TASK_STATUSES.map((status) => <option key={status} value={status}>{TASK_STATUS_LABELS[status]}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad</Label>
            <select id="priority" name="priority" defaultValue={initialValues.priority} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground">
              {TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{TASK_PRIORITY_LABELS[priority]}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="progress">Progreso (%)</Label>
            <Input id="progress" name="progress" type="number" min={0} max={100} defaultValue={initialValues.progress} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Fecha objetivo</Label>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={initialValues.dueDate} />
          </div>
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-xl border border-primary/10 bg-primary/[0.04]"><Link2 className="size-4 text-primary/75" /></div>
          <div>
            <div className="nexus-kicker">Dependencias</div>
            <h2 className="mt-2 text-base font-semibold text-slate-100">Trabajo que debe completarse antes</h2>
          </div>
        </div>
        {projectTasks.length ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {projectTasks.map((task) => (
              <label key={task.id} className="nexus-focus flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.018] p-3.5">
                <input type="checkbox" name="dependencyIds" value={task.id} defaultChecked={selectedDependencies.has(task.id)} className="mt-0.5 size-4 accent-[#55e6c1]" />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-slate-200">{task.title}</span>
                  <span className="mt-1 block text-xs text-slate-600">{TASK_STATUS_LABELS[task.status]}</span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-600">No hay otras tareas disponibles para este proyecto.</p>
        )}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Link href={taskId ? `/app/tareas/${taskId}` : "/app/tareas"} className={cn(buttonVariants({ variant: "ghost" }), "justify-center")}>
          <ArrowLeft /> Cancelar
        </Link>
        <div className="flex items-center gap-2">
          {initialValues.createdByAgentId ? <span className="hidden items-center gap-2 text-xs text-slate-600 sm:flex"><UserRoundCog className="size-4" /> Originada por un agente</span> : null}
          <FormSubmitButton pendingLabel="Guardando..."><Save />{mode === "create" ? "Crear tarea" : "Guardar cambios"}</FormSubmitButton>
        </div>
      </div>
    </form>
  );
}
