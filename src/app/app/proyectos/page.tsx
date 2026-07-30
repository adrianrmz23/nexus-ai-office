import type { Metadata } from "next";
import Link from "next/link";
import { FolderPlus, Search } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectEmptyState } from "@/components/projects/project-empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadProjectTechnologies } from "@/modules/projects/application/project-queries";
import {
  PROJECT_PRIORITIES,
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectPriority,
  type ProjectRecord,
  type ProjectStatus,
} from "@/modules/projects/domain/project";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = {
  title: "Proyectos",
};

type ProjectsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    error?: string;
    success?: string;
  }>;
};

function parseStatus(value?: string): ProjectStatus | "all" {
  return PROJECT_STATUSES.includes(value as ProjectStatus)
    ? (value as ProjectStatus)
    : "all";
}

function parsePriority(value?: string): ProjectPriority | "all" {
  return PROJECT_PRIORITIES.includes(value as ProjectPriority)
    ? (value as ProjectPriority)
    : "all";
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const params = await searchParams;
  const rawSearch = params.q?.trim().slice(0, 100) ?? "";
  const search = rawSearch
    .replace(/[,%()"'\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const status = parseStatus(params.status);
  const priority = parsePriority(params.priority);
  const { supabase, membership } = await requireCurrentWorkspace();
  const canManage = membership.role === "owner" || membership.role === "admin";

  let projectsQuery = supabase
    .from("projects")
    .select(
      "id, workspace_id, name, slug, client_name, description, icon, color, status, priority, repository_url, production_url, staging_url, permanent_instructions, project_rules, conventions, budget_amount, budget_currency, created_at, updated_at, archived_at",
    )
    .eq("workspace_id", membership.workspaceId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    projectsQuery = projectsQuery.eq("status", status);
  }

  if (priority !== "all") {
    projectsQuery = projectsQuery.eq("priority", priority);
  }

  if (search) {
    projectsQuery = projectsQuery.or(
      `name.ilike.%${search}%,client_name.ilike.%${search}%`,
    );
  }

  const [projectsResult, totalResult, activeResult, pausedResult, archivedResult] =
    await Promise.all([
      projectsQuery,
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspaceId),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspaceId)
        .eq("status", "active"),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspaceId)
        .eq("status", "paused"),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspaceId)
        .eq("status", "archived"),
    ]);

  const projects = (projectsResult.data ?? []) as ProjectRecord[];
  const technologyResult = await loadProjectTechnologies(
    supabase,
    membership.workspaceId,
    projects.map((project) => project.id),
  );
  const queryError = projectsResult.error
    ? "No pudimos consultar los proyectos. Verifica que ejecutaste la migración del Bloque 03."
    : technologyResult.error ?? undefined;
  const isFiltered =
    Boolean(search) || status !== "all" || priority !== "all";

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="nexus-kicker">Gestión operativa</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-foreground">
            Proyectos de la oficina
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Centraliza el stack, los entornos, las reglas y el contexto permanente
            que deberán utilizar los agentes en cada proyecto.
          </p>
        </div>

        {canManage ? (
          <Link
            href="/app/proyectos/nuevo"
            className={buttonVariants({ size: "lg" })}
          >
            <FolderPlus />
            Nuevo proyecto
          </Link>
        ) : null}
      </div>

      <div className="mt-7">
        <FormMessage error={params.error ?? queryError} success={params.success} />
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total registrados",
            value: totalResult.count ?? 0,
            detail: "Incluye historial",
          },
          {
            label: "Activos",
            value: activeResult.count ?? 0,
            detail: "Trabajo en curso",
          },
          {
            label: "Pausados",
            value: pausedResult.count ?? 0,
            detail: "Esperando continuidad",
          },
          {
            label: "Archivados",
            value: archivedResult.count ?? 0,
            detail: "Contexto conservado",
          },
        ].map((item) => (
          <article key={item.label} className="nexus-panel rounded-2xl p-5">
            <div className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground/80 uppercase">
              {item.label}
            </div>
            <div className="mt-3 text-2xl font-semibold text-foreground">
              {item.value}
            </div>
            <div className="mt-1 text-xs text-muted-foreground/80">{item.detail}</div>
          </article>
        ))}
      </section>

      <section className="nexus-panel mt-5 rounded-2xl p-4 sm:p-5">
        <form className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/80" />
            <Input
              name="q"
              defaultValue={search}
              placeholder="Buscar por proyecto o cliente..."
              className="pl-10"
            />
          </div>

          <select
            name="status"
            defaultValue={status}
            aria-label="Filtrar proyectos por estado"
            className="nexus-focus h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground transition-colors hover:border-primary/35"
          >
            <option value="all">Todos los estados</option>
            {PROJECT_STATUSES.map((projectStatus) => (
              <option key={projectStatus} value={projectStatus}>
                {PROJECT_STATUS_LABELS[projectStatus]}
              </option>
            ))}
          </select>

          <select
            name="priority"
            defaultValue={priority}
            aria-label="Filtrar proyectos por prioridad"
            className="nexus-focus h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground transition-colors hover:border-primary/35"
          >
            <option value="all">Todas las prioridades</option>
            {PROJECT_PRIORITIES.map((projectPriority) => (
              <option key={projectPriority} value={projectPriority}>
                {PROJECT_PRIORITY_LABELS[projectPriority]}
              </option>
            ))}
          </select>

          <Button type="submit" variant="outline">
            Aplicar filtros
          </Button>
        </form>
      </section>

      {projects.length > 0 ? (
        <section className="mt-5 grid gap-4 xl:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              technologies={technologyResult.byProject.get(project.id) ?? []}
              canManage={canManage}
            />
          ))}
        </section>
      ) : (
        <ProjectEmptyState filtered={isFiltered} canManage={canManage} />
      )}
    </div>
  );
}
