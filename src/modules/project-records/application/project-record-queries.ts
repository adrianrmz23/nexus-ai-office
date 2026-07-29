import type { CurrentWorkspaceContext } from "@/modules/workspaces/application/require-current-workspace";
import type {
  ErrorSolutionRecord,
  ProjectDecisionRecord,
  RecordAgent,
} from "@/modules/project-records/domain/project-record";

export async function loadProjectRecords(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  projectId: string,
): Promise<{ decisions: ProjectDecisionRecord[]; errors: ErrorSolutionRecord[] }> {
  const [decisionResult, errorResult, agentResult] = await Promise.all([
    supabase
      .from("project_decisions")
      .select("id, project_id, conversation_id, source_message_id, decided_by_agent_id, title, context, decision, consequences, status, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("error_solutions")
      .select("id, project_id, conversation_id, source_message_id, discovered_by_agent_id, title, error_signature, symptoms, root_cause, solution, validation_steps, status, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
    supabase.from("agents").select("id, name, role, icon, color").eq("workspace_id", workspaceId),
  ]);
  if (decisionResult.error) throw new Error(decisionResult.error.message);
  if (errorResult.error) throw new Error(errorResult.error.message);
  const agents = new Map(
    ((agentResult.data ?? []) as unknown as RecordAgent[]).map((agent) => [agent.id, agent]),
  );
  return {
    decisions: ((decisionResult.data ?? []) as ProjectDecisionRecord[]).map((record) => ({
      ...record,
      agent: record.decided_by_agent_id ? agents.get(record.decided_by_agent_id) ?? null : null,
    })),
    errors: ((errorResult.data ?? []) as ErrorSolutionRecord[]).map((record) => ({
      ...record,
      agent: record.discovered_by_agent_id ? agents.get(record.discovered_by_agent_id) ?? null : null,
    })),
  };
}
