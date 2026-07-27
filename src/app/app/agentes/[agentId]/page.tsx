import { createElement } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bot,
  BrainCircuit,
  Edit3,
  FolderKanban,
  Network,
  Wrench,
} from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  loadAgentCollaborators,
  loadAgentTechnologies,
} from "@/modules/agents/application/agent-queries";
import {
  AGENT_ROLE_LABELS,
  AGENT_SCOPE_LABELS,
  AGENT_STATUS_LABELS,
  AGENT_TOOL_LABELS,
  getAgentIcon,
  type AgentRecord,
  type AgentTool,
} from "@/modules/agents/domain/agent";
import { agentIdSchema } from "@/modules/agents/domain/agent-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Detalle del agente" };

type PageProps = {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

type RawProjectAssignment = {
  project_id: string;
  is_lead: boolean;
  projects:
    | { id: string; name: string; status: string; color: string }
    | Array<{ id: string; name: string; status: string; color: string }>
    | null;
};

export default async function AgentDetailPage({ params, searchParams }: PageProps) {
  const { agentId } = await params;
  const messages = await searchParams;
  const idResult = agentIdSchema.safeParse(agentId);
  if (!idResult.success) notFound();

  const { supabase, membership } = await requireCurrentWorkspace();
  const canManage = membership.role === "owner" || membership.role === "admin";
  const [agentResult, projectAssignmentsResult] = await Promise.all([
    supabase
      .from("agents")
      .select("id, workspace_id, name, slug, description, role, agent_kind, scope, icon, color, avatar_url, instructions, preferred_model_key, alternative_model_keys, creativity, memory_enabled, allowed_tools, escalation_rules, status, created_at, updated_at, archived_at")
      .eq("id", idResult.data)
      .eq("workspace_id", membership.workspaceId)
      .maybeSingle(),
    supabase
      .from("project_agents")
      .select("project_id, is_lead, projects(id, name, status, color)")
      .eq("workspace_id", membership.workspaceId)
      .eq("agent_id", idResult.data)
      .eq("status", "active")
      .order("assigned_at", { ascending: false }),
  ]);

  if (!agentResult.data) notFound();
  const agent = agentResult.data as AgentRecord;
  const [technologyResult, collaboratorsByAgent] = await Promise.all([
    loadAgentTechnologies(supabase, membership.workspaceId, [agent.id]),
    loadAgentCollaborators(supabase, membership.workspaceId, [agent.id]),
  ]);
  const technologies = technologyResult.byAgent.get(agent.id) ?? [];
  const collaborators = collaboratorsByAgent.get(agent.id) ?? [];
  const projectAssignments = (projectAssignmentsResult.data ?? []) as unknown as RawProjectAssignment[];

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="grid size-14 shrink-0 place-items-center rounded-2xl border"
            style={{
              color: agent.color,
              borderColor: `${agent.color}35`,
              backgroundColor: `${agent.color}12`,
            }}
          >
            {createElement(getAgentIcon(agent.icon), {
              className: "size-6",
              "aria-hidden": true,
            })}
          </div>
          <div className="min-w-0">
            <div className="nexus-kicker">Perfil de agente</div>
            <h1 className="mt-2 truncate text-3xl font-semibold tracking-[-0.035em] text-white">
              {agent.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-primary/10 bg-primary/[0.04] px-2.5 py-1 text-primary/75">
                {AGENT_ROLE_LABELS[agent.role]}
              </span>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-slate-500">
                {AGENT_STATUS_LABELS[agent.status]}
              </span>
              {agent.agent_kind === "system" ? (
                <span className="rounded-full border border-violet-400/10 bg-violet-400/[0.04] px-2.5 py-1 text-violet-300/75">
                  Agente del sistema
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {canManage ? (
          <Link
            href={`/app/agentes/${agent.id}/editar`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Edit3 />
            Editar agente
          </Link>
        ) : null}
      </div>

      <div className="mt-7">
        <FormMessage
          error={messages.error ?? technologyResult.error ?? undefined}
          success={messages.success}
        />
      </div>

      <section className="mt-7 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Bot className="size-4 text-primary/70" />
            <div className="text-sm font-semibold text-slate-100">Misión operativa</div>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-500">
            {agent.description || "Sin descripción registrada."}
          </p>
          <div className="mt-6 grid gap-3 border-t border-white/[0.055] pt-5 sm:grid-cols-3">
            <div>
              <div className="font-mono text-[0.58rem] tracking-wider text-slate-700 uppercase">Alcance</div>
              <div className="mt-2 text-sm text-slate-300">{AGENT_SCOPE_LABELS[agent.scope]}</div>
            </div>
            <div>
              <div className="font-mono text-[0.58rem] tracking-wider text-slate-700 uppercase">Creatividad</div>
              <div className="mt-2 text-sm text-slate-300">{agent.creativity}/100</div>
            </div>
            <div>
              <div className="font-mono text-[0.58rem] tracking-wider text-slate-700 uppercase">Memoria</div>
              <div className="mt-2 text-sm text-slate-300">{agent.memory_enabled ? "Habilitada" : "Deshabilitada"}</div>
            </div>
          </div>
        </article>

        <article className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <BrainCircuit className="size-4 text-primary/70" />
            <div className="text-sm font-semibold text-slate-100">Modelo preparado</div>
          </div>
          <div className="mt-5 rounded-xl border border-white/[0.055] bg-black/10 p-4">
            <div className="font-mono text-[0.58rem] tracking-wider text-slate-700 uppercase">Preferido</div>
            <div className="mt-2 text-sm text-slate-300">{agent.preferred_model_key ?? "Selección automática"}</div>
          </div>
          <div className="mt-3 text-xs leading-5 text-slate-600">
            {agent.alternative_model_keys.length > 0
              ? `Alternativas: ${agent.alternative_model_keys.join(", ")}`
              : "Las alternativas se configurarán con el catálogo de modelos."}
          </div>
        </article>
      </section>

      <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6">
        <div className="nexus-kicker">Instrucciones principales</div>
        <h2 className="mt-2 text-base font-semibold text-slate-100">Comportamiento permanente</h2>
        <pre className="nexus-scrollbar mt-5 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-white/[0.055] bg-black/15 p-4 font-mono text-xs leading-6 text-slate-400">
          {agent.instructions}
        </pre>
        {agent.escalation_rules ? (
          <div className="mt-4 rounded-xl border border-amber-400/10 bg-amber-400/[0.025] p-4">
            <div className="text-xs font-medium text-amber-200/75">Reglas de escalamiento</div>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-500">{agent.escalation_rules}</p>
          </div>
        ) : null}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <article className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Network className="size-4 text-primary/70" />
            <h2 className="text-sm font-semibold text-slate-100">Tecnologías</h2>
          </div>
          <div className="mt-4 space-y-2">
            {technologies.length > 0 ? technologies.map(({ technology, proficiency }) => (
              <div key={technology.id} className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] px-3.5 py-3">
                <span className="size-2 rounded-full" style={{ backgroundColor: technology.color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-slate-300">{technology.name}</div>
                  <div className="mt-1 text-xs text-slate-600">Dominio {proficiency}/5</div>
                </div>
              </div>
            )) : <p className="text-sm leading-6 text-slate-600">Sin especialidades registradas.</p>}
          </div>
        </article>

        <article className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Wrench className="size-4 text-primary/70" />
            <h2 className="text-sm font-semibold text-slate-100">Herramientas</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {agent.allowed_tools.length > 0 ? agent.allowed_tools.map((tool) => (
              <span key={tool} className="rounded-lg border border-white/[0.055] bg-white/[0.02] px-2.5 py-2 text-xs text-slate-500">
                {AGENT_TOOL_LABELS[tool as AgentTool]}
              </span>
            )) : <p className="text-sm leading-6 text-slate-600">Sin herramientas habilitadas.</p>}
          </div>
        </article>

        <article className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <FolderKanban className="size-4 text-primary/70" />
            <h2 className="text-sm font-semibold text-slate-100">Proyectos activos</h2>
          </div>
          <div className="mt-4 space-y-2">
            {projectAssignments.length > 0 ? projectAssignments.map((assignment) => {
              const project = Array.isArray(assignment.projects) ? assignment.projects[0] : assignment.projects;
              if (!project) return null;
              return (
                <Link key={project.id} href={`/app/proyectos/${project.id}`} className="nexus-focus flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] px-3.5 py-3 hover:border-primary/15">
                  <span className="size-2 rounded-full" style={{ backgroundColor: project.color }} />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{project.name}</span>
                  {assignment.is_lead ? <span className="font-mono text-[0.55rem] text-primary/70">LÍDER</span> : null}
                </Link>
              );
            }) : <p className="text-sm leading-6 text-slate-600">Aún no participa en proyectos.</p>}
          </div>
        </article>
      </section>

      <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Network className="size-4 text-primary/70" />
          <h2 className="text-sm font-semibold text-slate-100">Red de colaboración</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {collaborators.length > 0 ? collaborators.map(({ target_agent: collaborator }) => (
            <Link
              key={collaborator.id}
              href={`/app/agentes/${collaborator.id}`}
              className={cn("nexus-focus inline-flex items-center gap-2 rounded-lg border border-white/[0.055] bg-white/[0.02] px-3 py-2 text-xs text-slate-400 hover:border-primary/15")}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: collaborator.color }} />
              {collaborator.name}
            </Link>
          )) : <p className="text-sm leading-6 text-slate-600">No tiene handoffs directos configurados.</p>}
        </div>
      </section>
    </div>
  );
}
