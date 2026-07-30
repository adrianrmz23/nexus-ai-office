"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, FileCode2, Save } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ARTIFACT_TYPES,
  ARTIFACT_TYPE_LABELS,
} from "@/modules/artifacts/domain/artifact";

type Project = { id: string; name: string; color: string };
type Task = { id: string; project_id: string; title: string; status: string };
type Agent = { id: string; name: string; projectIds: string[] };

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  projects: Project[];
  tasks: Task[];
  agents: Agent[];
  initialValues: {
    projectId: string;
    title: string;
    artifactType: string;
    language: string;
    filePath: string;
    content: string;
    changeSummary: string;
    taskId: string;
    conversationId: string;
    sourceMessageId: string;
    createdByAgentId: string;
  };
  error?: string;
};

export function ArtifactForm({ action, projects, tasks, agents, initialValues, error }: Props) {
  const [projectId, setProjectId] = useState(initialValues.projectId || projects[0]?.id || "");
  const projectTasks = useMemo(() => tasks.filter((task) => task.project_id === projectId), [tasks, projectId]);
  const projectAgents = useMemo(() => agents.filter((agent) => agent.projectIds.includes(projectId)), [agents, projectId]);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="conversationId" value={initialValues.conversationId} />
      <input type="hidden" name="sourceMessageId" value={initialValues.sourceMessageId} />
      <FormMessage error={error} />

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-xl border border-primary/10 bg-primary/[0.04]"><FileCode2 className="size-4 text-primary/75" /></div>
          <div>
            <div className="nexus-kicker">Artefacto versionado</div>
            <h2 className="mt-2 text-base font-semibold text-foreground">Identidad y procedencia</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">El contenido queda vinculado al proyecto, tarea, conversación y agente que lo originó.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="projectId">Proyecto</Label>
            <select id="projectId" name="projectId" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground" required>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="artifactType">Tipo</Label>
            <select id="artifactType" name="artifactType" defaultValue={initialValues.artifactType} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground">
              {ARTIFACT_TYPES.map((type) => <option key={type} value={type}>{ARTIFACT_TYPE_LABELS[type]}</option>)}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" defaultValue={initialValues.title} maxLength={180} required autoFocus placeholder="Ej. Componente ProductGallery" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taskId">Tarea relacionada</Label>
            <select id="taskId" name="taskId" defaultValue={initialValues.taskId} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground">
              <option value="">Sin tarea</option>
              {projectTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="createdByAgentId">Agente autor</Label>
            <select id="createdByAgentId" name="createdByAgentId" defaultValue={initialValues.createdByAgentId} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground">
              <option value="">Creado por el usuario</option>
              {projectAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Lenguaje o formato</Label>
            <Input id="language" name="language" defaultValue={initialValues.language} maxLength={80} placeholder="tsx, liquid, sql, markdown..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filePath">Ruta opcional</Label>
            <Input id="filePath" name="filePath" defaultValue={initialValues.filePath} maxLength={500} placeholder="src/components/product-gallery.tsx" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="changeSummary">Resumen inicial</Label>
            <Input id="changeSummary" name="changeSummary" defaultValue={initialValues.changeSummary} maxLength={4_000} placeholder="Primera versión creada desde la conversación." />
          </div>
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="nexus-kicker">Versión 1</div>
        <h2 className="mt-2 text-base font-semibold text-foreground">Contenido completo</h2>
        <div className="mt-5">
          <Textarea id="content" name="content" defaultValue={initialValues.content} className="nexus-scrollbar min-h-[32rem] font-mono text-xs leading-6" maxLength={300_000} required />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Link href="/app/artefactos" className={cn(buttonVariants({ variant: "ghost" }), "justify-center")}><ArrowLeft />Cancelar</Link>
        <FormSubmitButton pendingLabel="Guardando artefacto..."><Save />Guardar artefacto</FormSubmitButton>
      </div>
    </form>
  );
}
