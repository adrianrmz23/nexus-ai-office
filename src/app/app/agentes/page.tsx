import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Plus, Search } from "lucide-react";

import { AgentCard } from "@/components/agents/agent-card";
import { AgentEmptyState } from "@/components/agents/agent-empty-state";
import { FormMessage } from "@/components/auth/form-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadAgentTechnologies } from "@/modules/agents/application/agent-queries";
import {
  AGENT_ROLES,
  AGENT_ROLE_LABELS,
  AGENT_STATUSES,
  AGENT_STATUS_LABELS,
  type AgentRecord,
  type AgentRole,
  type AgentStatus,
} from "@/modules/agents/domain/agent";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Agentes" };

type AgentsPageProps = {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    error?: string;
    success?: string;
  }>;
};

function parseRole(value?: string): AgentRole | "all" {
  return AGENT_ROLES.includes(value as AgentRole)
    ? (value as AgentRole)
    : "all";
}

function parseStatus(value?: string): AgentStatus | "all" {
  return AGENT_STATUSES.includes(value as AgentStatus)
    ? (value as AgentStatus)
    : "all";
}

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const params = await searchParams;
  const search = (params.q?.trim().slice(0, 100) ?? "")
    .replace(/[,%()"'\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const role = parseRole(params.role);
  const status = parseStatus(params.status);
  const { supabase, membership } = await requireCurrentWorkspace();
  const canManage = membership.role === "owner" || membership.role === "admin";

  let agentsQuery = supabase
    .from("agents")
    .select(
      "id, workspace_id, name, slug, description, role, agent_kind, scope, icon, color, avatar_url, instructions, preferred_model_key, alternative_model_keys, creativity, memory_enabled, allowed_tools, escalation_rules, status, created_at, updated_at, archived_at",
    )
    .eq("workspace_id", membership.workspaceId)
    .order("agent_kind", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(100);

  if (role !== "all") agentsQuery = agentsQuery.eq("role", role);
  if (status !== "all") agentsQuery = agentsQuery.eq("status", status);
  if (search) agentsQuery = agentsQuery.ilike("name", `%${search}%`);

  const [agentsResult, totalResult, activeResult, systemResult, assignmentResult] =
    await Promise.all([
      agentsQuery,
      supabase
        .from("agents")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspaceId),
      supabase
        .from("agents")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspaceId)
        .eq("status", "active"),
      supabase
        .from("agents")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspaceId)
        .eq("agent_kind", "system"),
      supabase
        .from("project_agents")
        .select("agent_id")
        .eq("workspace_id", membership.workspaceId)
        .eq("status", "active"),
    ]);

  const agents = (agentsResult.data ?? []) as AgentRecord[];
  const technologiesResult = await loadAgentTechnologies(
    supabase,
    membership.workspaceId,
    agents.map((agent) => agent.id),
  );
  const projectCountByAgent = new Map<string, number>();
  for (const assignment of assignmentResult.data ?? []) {
    projectCountByAgent.set(
      assignment.agent_id,
      (projectCountByAgent.get(assignment.agent_id) ?? 0) + 1,
    );
  }

  const queryError = agentsResult.error
    ? "No pudimos consultar los agentes. Verifica que ejecutaste la migración del Bloque 04."
    : technologiesResult.error ?? undefined;
  const isFiltered = Boolean(search) || role !== "all" || status !== "all";

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="nexus-kicker">Equipo especializado</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">
            Agentes de la oficina
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Administra roles, especialidades, herramientas y relaciones de
            colaboración. Los agentes del sistema pueden personalizarse sin
            quedar ligados a un proveedor de IA.
          </p>
        </div>
        {canManage ? (
          <Link href="/app/agentes/nuevo" className={buttonVariants({ size: "lg" })}>
            <Plus />
            Nuevo agente
          </Link>
        ) : null}
      </div>

      <div className="mt-7">
        <FormMessage error={params.error ?? queryError} success={params.success} />
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total registrados", value: totalResult.count ?? 0, detail: "Incluye historial" },
          { label: "Activos", value: activeResult.count ?? 0, detail: "Disponibles para equipos" },
          { label: "Agentes del sistema", value: systemResult.count ?? 0, detail: "Especialistas iniciales" },
          { label: "Asignaciones activas", value: assignmentResult.data?.length ?? 0, detail: "Relaciones con proyectos" },
        ].map((item) => (
          <article key={item.label} className="nexus-panel rounded-2xl p-5">
            <div className="font-mono text-[0.62rem] tracking-[0.14em] text-slate-600 uppercase">{item.label}</div>
            <div className="mt-3 text-2xl font-semibold text-white">{item.value}</div>
            <div className="mt-1 text-xs text-slate-600">{item.detail}</div>
          </article>
        ))}
      </section>

      <section className="nexus-panel mt-5 rounded-2xl p-4 sm:p-5">
        <form className="grid gap-3 lg:grid-cols-[1fr_13rem_13rem_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-600" />
            <Input name="q" defaultValue={search} placeholder="Buscar por nombre..." className="pl-10" />
          </div>
          <select name="role" defaultValue={role} aria-label="Filtrar por rol" className="nexus-focus h-11 rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground">
            <option value="all">Todos los roles</option>
            {AGENT_ROLES.map((item) => <option key={item} value={item}>{AGENT_ROLE_LABELS[item]}</option>)}
          </select>
          <select name="status" defaultValue={status} aria-label="Filtrar por estado" className="nexus-focus h-11 rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground">
            <option value="all">Todos los estados</option>
            {AGENT_STATUSES.map((item) => <option key={item} value={item}>{AGENT_STATUS_LABELS[item]}</option>)}
          </select>
          <Button type="submit" variant="outline">Aplicar filtros</Button>
        </form>
      </section>

      {agents.length > 0 ? (
        <section className="mt-5 grid gap-4 xl:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              technologies={technologiesResult.byAgent.get(agent.id) ?? []}
              projectCount={projectCountByAgent.get(agent.id) ?? 0}
              canManage={canManage}
            />
          ))}
        </section>
      ) : (
        <AgentEmptyState filtered={isFiltered} canManage={canManage} />
      )}
    </div>
  );
}
