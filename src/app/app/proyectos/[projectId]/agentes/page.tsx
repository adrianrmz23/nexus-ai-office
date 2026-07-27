import { createElement } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Crown,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import {
  assignAgentToProject,
  assignSuggestedTeam,
  removeAgentFromProject,
} from "@/modules/agents/application/agent-actions";
import {
  loadAgentTechnologies,
  loadProjectAgentAssignments,
} from "@/modules/agents/application/agent-queries";
import {
  recommendProjectAgents,
  type ProjectTechnologySignal,
} from "@/modules/agents/application/agent-recommender";
import {
  AGENT_ROLE_LABELS,
  getAgentIcon,
  type AgentRecord,
} from "@/modules/agents/domain/agent";
import { projectIdSchema } from "@/modules/projects/domain/project-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Equipo del proyecto" };

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

type RawProjectTechnology = {
  technology_id: string;
  technologies:
    | ProjectTechnologySignal
    | ProjectTechnologySignal[]
    | null;
};

export default async function ProjectAgentsPage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const messages = await searchParams;
  const idResult = projectIdSchema.safeParse(projectId);
  if (!idResult.success) notFound();

  const { supabase, membership } = await requireCurrentWorkspace();
  const canManage = membership.role === "owner" || membership.role === "admin";
  const [projectResult, agentsResult, projectTechnologiesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, description, status, color")
      .eq("id", idResult.data)
      .eq("workspace_id", membership.workspaceId)
      .maybeSingle(),
    supabase
      .from("agents")
      .select("id, workspace_id, name, slug, description, role, agent_kind, scope, icon, color, avatar_url, instructions, preferred_model_key, alternative_model_keys, creativity, memory_enabled, allowed_tools, escalation_rules, status, created_at, updated_at, archived_at")
      .eq("workspace_id", membership.workspaceId)
      .eq("status", "active")
      .order("agent_kind", { ascending: true })
      .order("name"),
    supabase
      .from("project_technologies")
      .select("technology_id, technologies(id, name, category)")
      .eq("workspace_id", membership.workspaceId)
      .eq("project_id", idResult.data),
  ]);

  if (!projectResult.data) notFound();

  const agents = (agentsResult.data ?? []) as AgentRecord[];
  const [technologiesByAgentResult, assignments] = await Promise.all([
    loadAgentTechnologies(
      supabase,
      membership.workspaceId,
      agents.map((agent) => agent.id),
    ),
    loadProjectAgentAssignments(supabase, membership.workspaceId, idResult.data),
  ]);

  const projectTechnologies: ProjectTechnologySignal[] = [];
  for (const row of (projectTechnologiesResult.data ?? []) as unknown as RawProjectTechnology[]) {
    const technology = Array.isArray(row.technologies)
      ? row.technologies[0]
      : row.technologies;
    if (technology) projectTechnologies.push(technology);
  }

  const assignedAgentIds = new Set(assignments.map((assignment) => assignment.agent_id));
  const recommendations = recommendProjectAgents({
    agents,
    technologiesByAgent: technologiesByAgentResult.byAgent,
    projectTechnologies,
    assignedAgentIds,
    limit: 6,
  });
  const availableAgents = agents.filter((agent) => !assignedAgentIds.has(agent.id));
  const project = projectResult.data;

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <Link
            href={`/app/proyectos/${project.id}`}
            className="nexus-focus inline-flex items-center gap-2 text-xs text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            Volver al proyecto
          </Link>
          <div className="nexus-kicker mt-5">Equipo operativo</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">
            Agentes de {project.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Asigna especialistas y revisa la recomendación basada en el stack,
            las relaciones de dominio y los roles disponibles.
          </p>
        </div>
        <div className="rounded-xl border border-primary/10 bg-primary/[0.035] px-4 py-3 text-right">
          <div className="font-mono text-[0.58rem] tracking-wider text-slate-600 uppercase">Equipo activo</div>
          <div className="mt-1 text-xl font-semibold text-white">{assignments.length}</div>
        </div>
      </div>

      <div className="mt-7">
        <FormMessage
          error={messages.error ?? technologiesByAgentResult.error ?? undefined}
          success={messages.success}
        />
      </div>

      <section className="nexus-panel mt-7 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="nexus-kicker">Asignaciones actuales</div>
            <h2 className="mt-2 text-base font-semibold text-slate-100">Equipo del proyecto</h2>
          </div>
          {project.status === "archived" ? (
            <span className="rounded-full border border-slate-400/10 bg-slate-400/[0.03] px-3 py-1.5 text-xs text-slate-500">
              Proyecto archivado
            </span>
          ) : null}
        </div>

        {assignments.length > 0 ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {assignments.map((assignment) => (
              <article key={assignment.agent_id} className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="grid size-10 shrink-0 place-items-center rounded-xl border"
                    style={{
                      color: assignment.agent.color,
                      borderColor: `${assignment.agent.color}30`,
                      backgroundColor: `${assignment.agent.color}0f`,
                    }}
                  >
                    {createElement(getAgentIcon(assignment.agent.icon), { className: "size-4", "aria-hidden": true })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/app/agentes/${assignment.agent.id}`} className="truncate text-sm font-semibold text-slate-200 hover:text-primary">
                        {assignment.agent.name}
                      </Link>
                      {assignment.is_lead ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/10 bg-amber-400/[0.04] px-2 py-1 font-mono text-[0.55rem] text-amber-300/75">
                          <Crown className="size-3" /> LÍDER
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{AGENT_ROLE_LABELS[assignment.agent.role]}</div>
                    {assignment.assignment_reason ? (
                      <p className="mt-3 text-xs leading-5 text-slate-500">{assignment.assignment_reason}</p>
                    ) : null}
                  </div>
                </div>
                {canManage ? (
                  <div className="mt-4 flex justify-end border-t border-white/[0.05] pt-3">
                    <form action={removeAgentFromProject}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="agentId" value={assignment.agent_id} />
                      <ConfirmSubmitButton
                        type="submit"
                        size="sm"
                        variant="ghost"
                        confirmationMessage={`¿Retirar a ${assignment.agent.name} de este proyecto?`}
                      >
                        <Trash2 /> Retirar
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-white/[0.08] bg-black/10 p-6 text-center">
            <Bot className="mx-auto size-5 text-slate-700" />
            <p className="mt-3 text-sm text-slate-500">Este proyecto todavía no tiene agentes asignados.</p>
          </div>
        )}
      </section>

      <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary/75" />
              <div className="nexus-kicker">Recomendación de equipo</div>
            </div>
            <h2 className="mt-2 text-base font-semibold text-slate-100">Especialistas sugeridos</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Esta primera versión utiliza reglas verificables de rol, tecnologías
              coincidentes y memoria habilitada. No ejecuta modelos ni genera costos.
            </p>
          </div>
          {canManage && recommendations.length > 0 && project.status !== "archived" ? (
            <form action={assignSuggestedTeam}>
              <input type="hidden" name="projectId" value={project.id} />
              {recommendations.map((recommendation) => (
                <input key={recommendation.agent.id} type="hidden" name="agentIds" value={recommendation.agent.id} />
              ))}
              <FormSubmitButton type="submit" pendingLabel="Asignando...">
                <CheckCircle2 /> Asignar equipo sugerido
              </FormSubmitButton>
            </form>
          ) : null}
        </div>

        {recommendations.length > 0 ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((recommendation) => (
              <article key={recommendation.agent.id} className="rounded-xl border border-primary/10 bg-primary/[0.02] p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="grid size-9 shrink-0 place-items-center rounded-lg border"
                    style={{ color: recommendation.agent.color, borderColor: `${recommendation.agent.color}30`, backgroundColor: `${recommendation.agent.color}0f` }}
                  >
                    {createElement(getAgentIcon(recommendation.agent.icon), { className: "size-4", "aria-hidden": true })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-200">{recommendation.agent.name}</div>
                    <div className="mt-1 text-xs text-slate-600">{AGENT_ROLE_LABELS[recommendation.agent.role]}</div>
                  </div>
                  <span className="font-mono text-[0.58rem] text-primary/75">{recommendation.confidence}%</span>
                </div>
                <ul className="mt-4 space-y-2 text-xs leading-5 text-slate-500">
                  {recommendation.reasons.map((reason) => (
                    <li key={reason} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-primary/60" />{reason}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm leading-6 text-slate-600">
            No hay recomendaciones pendientes. El equipo actual ya cubre los perfiles disponibles.
          </p>
        )}
      </section>

      {canManage && availableAgents.length > 0 && project.status !== "archived" ? (
        <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6">
          <div className="nexus-kicker">Asignación manual</div>
          <h2 className="mt-2 text-base font-semibold text-slate-100">Agregar un especialista</h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {availableAgents.map((agent) => (
              <form key={agent.id} action={assignAgentToProject} className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="agentId" value={agent.id} />
                <div className="flex items-start gap-3">
                  <div
                    className="grid size-9 shrink-0 place-items-center rounded-lg border"
                    style={{ color: agent.color, borderColor: `${agent.color}30`, backgroundColor: `${agent.color}0f` }}
                  >
                    {createElement(getAgentIcon(agent.icon), { className: "size-4", "aria-hidden": true })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-200">{agent.name}</div>
                    <div className="mt-1 text-xs text-slate-600">{AGENT_ROLE_LABELS[agent.role]}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <Input name="assignmentReason" placeholder="Motivo opcional de la asignación" maxLength={1200} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    <input type="checkbox" name="isLead" className="size-4 accent-[#55e6c1]" />
                    Designar como líder
                  </label>
                  <FormSubmitButton type="submit" size="sm" pendingLabel="Asignando...">
                    <Plus /> Asignar
                  </FormSubmitButton>
                </div>
              </form>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
