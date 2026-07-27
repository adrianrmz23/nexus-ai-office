import type { CurrentWorkspaceContext } from "@/modules/workspaces/application/require-current-workspace";
import type {
  AgentCollaboratorRecord,
  AgentRecord,
  AgentTechnologyRecord,
  ProjectAgentRecord,
} from "@/modules/agents/domain/agent";

type RawTechnology = AgentTechnologyRecord["technology"];
type RawAgentTechnology = {
  agent_id: string;
  technology_id: string;
  proficiency: number;
  is_primary: boolean;
  technologies: RawTechnology | RawTechnology[] | null;
};

type RawCollaborator = AgentCollaboratorRecord["target_agent"];
type RawAgentCollaborator = {
  source_agent_id: string;
  target_agent_id: string;
  agents: RawCollaborator | RawCollaborator[] | null;
};

type RawProjectAgent = {
  project_id: string;
  agent_id: string;
  is_lead: boolean;
  status: "active" | "inactive";
  assignment_reason: string;
  assigned_at: string;
  agents: AgentRecord | AgentRecord[] | null;
};

export async function loadAgentTechnologies(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  agentIds: string[],
): Promise<{
  byAgent: Map<string, AgentTechnologyRecord[]>;
  error: string | null;
}> {
  const byAgent = new Map<string, AgentTechnologyRecord[]>();

  if (agentIds.length === 0) {
    return { byAgent, error: null };
  }

  const { data, error } = await supabase
    .from("agent_technologies")
    .select(
      "agent_id, technology_id, proficiency, is_primary, technologies(id, name, category, color, icon, version, status)",
    )
    .eq("workspace_id", workspaceId)
    .in("agent_id", agentIds)
    .order("is_primary", { ascending: false })
    .order("proficiency", { ascending: false });

  if (error) {
    return {
      byAgent,
      error:
        "No pudimos consultar las especialidades. Verifica la migración del Bloque 04.",
    };
  }

  for (const row of (data ?? []) as unknown as RawAgentTechnology[]) {
    const technology = Array.isArray(row.technologies)
      ? row.technologies[0]
      : row.technologies;

    if (!technology) {
      continue;
    }

    const current = byAgent.get(row.agent_id) ?? [];
    current.push({
      agent_id: row.agent_id,
      technology_id: row.technology_id,
      proficiency: row.proficiency,
      is_primary: row.is_primary,
      technology,
    });
    byAgent.set(row.agent_id, current);
  }

  return { byAgent, error: null };
}

export async function loadAgentCollaborators(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  agentIds: string[],
): Promise<Map<string, AgentCollaboratorRecord[]>> {
  const byAgent = new Map<string, AgentCollaboratorRecord[]>();

  if (agentIds.length === 0) {
    return byAgent;
  }

  const { data } = await supabase
    .from("agent_collaborators")
    .select(
      "source_agent_id, target_agent_id, agents!agent_collaborators_target_agent_id_fkey(id, name, role, icon, color, status)",
    )
    .eq("workspace_id", workspaceId)
    .eq("enabled", true)
    .in("source_agent_id", agentIds);

  for (const row of (data ?? []) as unknown as RawAgentCollaborator[]) {
    const targetAgent = Array.isArray(row.agents) ? row.agents[0] : row.agents;

    if (!targetAgent) {
      continue;
    }

    const current = byAgent.get(row.source_agent_id) ?? [];
    current.push({
      source_agent_id: row.source_agent_id,
      target_agent_id: row.target_agent_id,
      target_agent: targetAgent,
    });
    byAgent.set(row.source_agent_id, current);
  }

  return byAgent;
}

export async function loadProjectAgentAssignments(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  projectId: string,
): Promise<ProjectAgentRecord[]> {
  const { data } = await supabase
    .from("project_agents")
    .select(
      "project_id, agent_id, is_lead, status, assignment_reason, assigned_at, agents(id, workspace_id, name, slug, description, role, agent_kind, scope, icon, color, avatar_url, instructions, preferred_model_key, alternative_model_keys, creativity, memory_enabled, allowed_tools, escalation_rules, status, created_at, updated_at, archived_at)",
    )
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .eq("status", "active")
    .order("is_lead", { ascending: false })
    .order("assigned_at", { ascending: true });

  const assignments: ProjectAgentRecord[] = [];

  for (const row of (data ?? []) as unknown as RawProjectAgent[]) {
    const assignedAgent = Array.isArray(row.agents) ? row.agents[0] : row.agents;

    if (!assignedAgent) {
      continue;
    }

    assignments.push({
      project_id: row.project_id,
      agent_id: row.agent_id,
      is_lead: row.is_lead,
      status: row.status,
      assignment_reason: row.assignment_reason,
      assigned_at: row.assigned_at,
      agent: assignedAgent,
    });
  }

  return assignments;
}
