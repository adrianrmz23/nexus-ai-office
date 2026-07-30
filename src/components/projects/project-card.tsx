import { createElement } from "react";
import Link from "next/link";
import {
  Archive,
  CirclePause,
  Edit3,
  ExternalLink,
  RotateCcw,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { cn } from "@/lib/utils";
import { setProjectStatus } from "@/modules/projects/application/project-actions";
import {
  getProjectIcon,
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  type ProjectRecord,
  type ProjectTechnologyRecord,
} from "@/modules/projects/domain/project";

type ProjectCardProps = {
  project: ProjectRecord;
  technologies: ProjectTechnologyRecord[];
  canManage: boolean;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function nextOperationalStatus(project: ProjectRecord) {
  return project.status === "active" ? "paused" : "active";
}

export function ProjectCard({
  project,
  technologies,
  canManage,
}: ProjectCardProps) {
  const iconElement = createElement(getProjectIcon(project.icon), {
    className: "size-5",
    "aria-hidden": true,
  });
  const visibleTechnologies = technologies.slice(0, 5);
  const remainingTechnologies = technologies.length - visibleTechnologies.length;

  return (
    <article className="nexus-panel group rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div
          className="grid size-12 shrink-0 place-items-center rounded-xl border"
          style={{
            color: project.color,
            borderColor: `${project.color}30`,
            backgroundColor: `${project.color}0f`,
          }}
        >
          {iconElement}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-foreground">
              {project.name}
            </h2>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[0.65rem]",
                project.status === "active" &&
                  "border-emerald-400/10 bg-emerald-400/[0.04] text-emerald-300/75",
                project.status === "planning" &&
                  "border-cyan-400/10 bg-cyan-400/[0.04] text-cyan-300/75",
                project.status === "paused" &&
                  "border-amber-400/10 bg-amber-400/[0.04] text-amber-300/75",
                project.status === "completed" &&
                  "border-violet-400/10 bg-violet-400/[0.04] text-violet-300/75",
                project.status === "archived" &&
                  "border-slate-400/10 bg-slate-400/[0.04] text-muted-foreground",
              )}
            >
              {PROJECT_STATUS_LABELS[project.status]}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "rounded-md bg-muted/40 px-2 py-1",
                project.priority === "critical"
                  ? "text-rose-300/80"
                  : project.priority === "high"
                    ? "text-amber-300/75"
                    : "text-muted-foreground/80",
              )}
            >
              Prioridad {PROJECT_PRIORITY_LABELS[project.priority].toLowerCase()}
            </span>
            {project.client_name ? (
              <span className="truncate text-muted-foreground/80">
                Cliente: {project.client_name}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-5 min-h-12 text-sm leading-6 text-muted-foreground">
        {project.description ||
          "Todavía no se ha agregado una descripción del proyecto."}
      </p>

      <div className="mt-4 flex min-h-7 flex-wrap gap-1.5">
        {visibleTechnologies.length > 0 ? (
          <>
            {visibleTechnologies.map(({ technology }) => (
              <span
                key={technology.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/35 px-2 py-1 font-mono text-[0.58rem] text-muted-foreground"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: technology.color }}
                  aria-hidden="true"
                />
                {technology.name}
              </span>
            ))}
            {remainingTechnologies > 0 ? (
              <span className="rounded-md bg-muted/35 px-2 py-1 font-mono text-[0.58rem] text-muted-foreground/80">
                +{remainingTechnologies}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-xs text-muted-foreground/60">Sin tecnologías asignadas</span>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground/60">
          Actualizado {formatDate(project.updated_at)}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/proyectos/${project.id}`}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <ExternalLink />
            Abrir
          </Link>

          {canManage ? (
            <>
              <Link
                href={`/app/proyectos/${project.id}/editar`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Edit3 />
                Editar
              </Link>

              {project.status === "archived" ? (
                <form action={setProjectStatus}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="status" value="active" />
                  <FormSubmitButton
                    type="submit"
                    variant="ghost"
                    size="sm"
                    pendingLabel="Restaurando..."
                  >
                    <RotateCcw />
                    Restaurar
                  </FormSubmitButton>
                </form>
              ) : (
                <>
                  <form action={setProjectStatus}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={nextOperationalStatus(project)}
                    />
                    <FormSubmitButton
                      type="submit"
                      variant="ghost"
                      size="sm"
                      pendingLabel="Actualizando..."
                    >
                      {project.status === "active" ? (
                        <CirclePause />
                      ) : (
                        <RotateCcw />
                      )}
                      {project.status === "active" ? "Pausar" : "Activar"}
                    </FormSubmitButton>
                  </form>

                  <form action={setProjectStatus}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="status" value="archived" />
                    <ConfirmSubmitButton
                      type="submit"
                      variant="ghost"
                      size="sm"
                      confirmationMessage={`¿Archivar ${project.name}? Se conservarán su contexto y relaciones.`}
                    >
                      <Archive />
                      Archivar
                    </ConfirmSubmitButton>
                  </form>
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
