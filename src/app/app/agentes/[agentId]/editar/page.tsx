import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AgentForm } from "@/components/agents/agent-form";
import { updateAgent } from "@/modules/agents/application/agent-actions";
import { agentIdSchema } from "@/modules/agents/domain/agent-schema";
import type { AgentRecord, AgentRole, AgentStatus } from "@/modules/agents/domain/agent";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Editar agente" };

type TechnologyAssignment = { technology_id: string };
type CollaboratorAssignment = { target_agent_id: string };

type PageProps = {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditAgentPage({ params, searchParams }: PageProps) {
  const { agentId } = await params;
  const { error } = await searchParams;
  const idResult = agentIdSchema.safeParse(agentId);
  if (!idResult.success) notFound();

  const { supabase, membership } = await requireCurrentWorkspace();
  const [agentResult, technologiesResult, assignmentsResult, collaboratorsResult, selectedCollaboratorsResult] = await Promise.all([
    supabase
      .from("agents")
      .select("id, workspace_id, name, slug, description, role, agent_kind, scope, icon, color, avatar_url, instructions, preferred_model_key, alternative_model_keys, creativity, memory_enabled, allowed_tools, escalation_rules, status, created_at, updated_at, archived_at")
      .eq("id", idResult.data)
      .eq("workspace_id", membership.workspaceId)
      .maybeSingle(),
    supabase.from("technologies").select("id, name, category, version, status, color").eq("workspace_id", membership.workspaceId).neq("status", "archived").order("name"),
    supabase.from("agent_technologies").select("technology_id").eq("workspace_id", membership.workspaceId).eq("agent_id", idResult.data),
    supabase.from("agents").select("id, name, role, status").eq("workspace_id", membership.workspaceId).neq("id", idResult.data).neq("status", "archived").order("name"),
    supabase.from("agent_collaborators").select("target_agent_id").eq("workspace_id", membership.workspaceId).eq("source_agent_id", idResult.data).eq("enabled", true),
  ]);

  if (!agentResult.data) notFound();
  const agent = agentResult.data as AgentRecord;

  return (
    <div className="mx-auto max-w-5xl pb-20 lg:pb-0">
      <div className="nexus-kicker">Equipo especializado</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">Editar {agent.name}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
        Ajusta su comportamiento sin perder las asignaciones ni el historial.
      </p>
      <div className="mt-8">
        <AgentForm
          action={updateAgent}
          error={error}
          agentId={agent.id}
          mode="edit"
          technologies={(technologiesResult.data ?? []) as Array<{ id: string; name: string; category: string; version: string | null; status: "active" | "inactive" | "archived"; color: string }>}
          collaborators={(collaboratorsResult.data ?? []) as Array<{ id: string; name: string; role: AgentRole; status: AgentStatus }>}
          initialValues={{
            name: agent.name,
            description: agent.description,
            role: agent.role,
            scope: agent.scope,
            icon: agent.icon,
            color: agent.color,
            avatarUrl: agent.avatar_url ?? "",
            instructions: agent.instructions,
            preferredModelKey: agent.preferred_model_key ?? "",
            alternativeModelKeys: agent.alternative_model_keys.join(", "),
            creativity: agent.creativity,
            memoryEnabled: agent.memory_enabled,
            allowedTools: agent.allowed_tools,
            escalationRules: agent.escalation_rules,
            status: agent.status,
            technologyIds: ((assignmentsResult.data ?? []) as TechnologyAssignment[]).map(
              (item) => item.technology_id,
            ),
            collaboratorIds: ((selectedCollaboratorsResult.data ?? []) as CollaboratorAssignment[]).map(
              (item) => item.target_agent_id,
            ),
          }}
        />
      </div>
    </div>
  );
}
