import { createElement } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  CirclePause,
  Edit3,
  GitBranch,
  Globe2,
  RotateCcw,
  ServerCog,
} from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { cn } from "@/lib/utils";
import { setProjectStatus } from "@/modules/projects/application/project-actions";
import { loadProjectTechnologies } from "@/modules/projects/application/project-queries";
import {
  getProjectIcon,
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  type ProjectRecord,
} from "@/modules/projects/domain/project";
import { projectIdSchema } from "@/modules/projects/domain/project-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = {
  title: "Detalle del proyecto",
};

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatBudget(amount: number | null, currency: string): string {
  if (amount === null) {
    return "Sin presupuesto definido";
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "Presupuesto no disponible";
  }

  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${numericAmount.toFixed(2)} ${currency}`;
  }
}

function ContextBlock({
  title,
  content,
  emptyText,
}: {
  title: string;
  content: string;
  emptyText: string;
}) {
  return (
    <article className="rounded-xl border border-white/[0.055] bg-black/10 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      {content ? (
        <pre className="nexus-scrollbar mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-slate-500">
          {content}
        </pre>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-600">{emptyText}</p>
      )}
    </article>
  );
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { projectId } = await params;
  const messages = await searchParams;
  const idResult = projectIdSchema.safeParse(projectId);

  if (!idResult.success) {
    notFound();
  }

  const { supabase, membership } = await requireCurrentWorkspace();
  const canManage = membership.role === "owner" || membership.role === "admin";
  const { data } = await supabase
    .from("projects")
    .select(
      "id, workspace_id, name, slug, client_name, description, icon, color, status, priority, repository_url, production_url, staging_url, permanent_instructions, project_rules, conventions, budget_amount, budget_currency, created_at, updated_at, archived_at",
    )
    .eq("id", idResult.data)
    .eq("workspace_id", membership.workspaceId)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const project = data as ProjectRecord;
  const technologyResult = await loadProjectTechnologies(
    supabase,
    membership.workspaceId,
    [project.id],
  );
  const technologies = technologyResult.byProject.get(project.id) ?? [];
  const iconElement = createElement(getProjectIcon(project.icon), {
    className: "size-6",
    "aria-hidden": true,
  });

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <Link
        href="/app/proyectos"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
      >
        <ArrowLeft />
        Volver a proyectos
      </Link>

      <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="grid size-14 shrink-0 place-items-center rounded-2xl border"
            style={{
              color: project.color,
              borderColor: `${project.color}30`,
              backgroundColor: `${project.color}0f`,
            }}
          >
            {iconElement}
          </div>
          <div className="min-w-0">
            <div className="nexus-kicker">Centro del proyecto</div>
            <h1 className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-white">
              {project.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1",
                  project.status === "active" &&
                    "border-emerald-400/10 bg-emerald-400/[0.04] text-emerald-300/75",
                  project.status === "planning" &&
                    "border-cyan-400/10 bg-cyan-400/[0.04] text-cyan-300/75",
                  project.status === "paused" &&
                    "border-amber-400/10 bg-amber-400/[0.04] text-amber-300/75",
                  project.status === "completed" &&
                    "border-violet-400/10 bg-violet-400/[0.04] text-violet-300/75",
                  project.status === "archived" &&
                    "border-slate-400/10 bg-slate-400/[0.04] text-slate-500",
                )}
              >
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-slate-500">
                Prioridad {PROJECT_PRIORITY_LABELS[project.priority].toLowerCase()}
              </span>
              {project.client_name ? (
                <span className="text-slate-600">Cliente: {project.client_name}</span>
              ) : null}
            </div>
          </div>
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/proyectos/${project.id}/editar`}
              className={buttonVariants({ variant: "outline" })}
            >
              <Edit3 />
              Editar
            </Link>

            {project.status === "archived" ? (
              <form action={setProjectStatus}>
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="status" value="active" />
                <input type="hidden" name="returnTo" value="detail" />
                <FormSubmitButton type="submit" pendingLabel="Restaurando...">
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
                    value={project.status === "active" ? "paused" : "active"}
                  />
                  <input type="hidden" name="returnTo" value="detail" />
                  <FormSubmitButton
                    type="submit"
                    variant="secondary"
                    pendingLabel="Actualizando..."
                  >
                    {project.status === "active" ? <CirclePause /> : <RotateCcw />}
                    {project.status === "active" ? "Pausar" : "Activar"}
                  </FormSubmitButton>
                </form>

                <form action={setProjectStatus}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="status" value="archived" />
                  <input type="hidden" name="returnTo" value="detail" />
                  <ConfirmSubmitButton
                    type="submit"
                    variant="ghost"
                    confirmationMessage={`¿Archivar ${project.name}? Se conservarán su contexto y tecnologías.`}
                  >
                    <Archive />
                    Archivar
                  </ConfirmSubmitButton>
                </form>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-7">
        <FormMessage
          error={messages.error ?? technologyResult.error ?? undefined}
          success={messages.success}
        />
      </div>

      <section className="mt-7 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="nexus-kicker">Resumen</div>
          <h2 className="mt-2 text-base font-semibold text-slate-100">
            Alcance actual
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-500">
            {project.description ||
              "Todavía no se ha documentado la descripción de este proyecto."}
          </p>
          <div className="mt-6 grid gap-3 border-t border-white/[0.055] pt-5 sm:grid-cols-3">
            <div>
              <div className="font-mono text-[0.58rem] tracking-wider text-slate-700 uppercase">
                Presupuesto
              </div>
              <div className="mt-2 text-sm text-slate-300">
                {formatBudget(project.budget_amount, project.budget_currency)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[0.58rem] tracking-wider text-slate-700 uppercase">
                Creado
              </div>
              <div className="mt-2 text-sm text-slate-300">
                {formatDate(project.created_at)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[0.58rem] tracking-wider text-slate-700 uppercase">
                Actualizado
              </div>
              <div className="mt-2 text-sm text-slate-300">
                {formatDate(project.updated_at)}
              </div>
            </div>
          </div>
        </article>

        <article className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="nexus-kicker">Stack activo</div>
          <h2 className="mt-2 text-base font-semibold text-slate-100">
            Tecnologías asignadas
          </h2>
          {technologies.length > 0 ? (
            <div className="mt-5 space-y-2">
              {technologies.map(({ technology }) => (
                <div
                  key={technology.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] px-3.5 py-3"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: technology.color }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-200">
                      {technology.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {technology.version ?? "Sin versión de referencia"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Este proyecto todavía no tiene tecnologías asignadas.
            </p>
          )}
        </article>
      </section>

      <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6">
        <div className="nexus-kicker">Puntos de acceso</div>
        <h2 className="mt-2 text-base font-semibold text-slate-100">
          Repositorio y entornos
        </h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            {
              label: "Repositorio",
              url: project.repository_url,
              icon: GitBranch,
            },
            {
              label: "Producción",
              url: project.production_url,
              icon: Globe2,
            },
            {
              label: "Staging",
              url: project.staging_url,
              icon: ServerCog,
            },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-xl border border-white/[0.055] bg-black/10 p-4"
            >
              {createElement(item.icon, {
                className: "size-4 text-primary/70",
                "aria-hidden": true,
              })}
              <div className="mt-4 text-sm font-medium text-slate-200">
                {item.label}
              </div>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs text-primary/75 hover:text-primary"
                >
                  <span className="truncate">Abrir enlace</span>
                  <ArrowUpRight className="size-3.5 shrink-0" />
                </a>
              ) : (
                <div className="mt-2 text-xs text-slate-700">No configurado</div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6">
        <div className="nexus-kicker">Contexto estructurado</div>
        <h2 className="mt-2 text-base font-semibold text-slate-100">
          Instrucciones permanentes del proyecto
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Estos bloques serán incorporados de forma controlada cuando habilitemos
          agentes, conversaciones y memoria semántica.
        </p>
        <div className="mt-5 grid gap-3 xl:grid-cols-3">
          <ContextBlock
            title="Instrucciones"
            content={project.permanent_instructions}
            emptyText="Aún no se han definido instrucciones permanentes."
          />
          <ContextBlock
            title="Reglas y restricciones"
            content={project.project_rules}
            emptyText="Aún no se han definido reglas específicas."
          />
          <ContextBlock
            title="Convenciones técnicas"
            content={project.conventions}
            emptyText="Aún no se han definido convenciones técnicas."
          />
        </div>
      </section>
    </div>
  );
}
