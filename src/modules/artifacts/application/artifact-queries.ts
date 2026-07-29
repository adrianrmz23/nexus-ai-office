import type { CurrentWorkspaceContext } from "@/modules/workspaces/application/require-current-workspace";
import type {
  ArtifactAgent,
  ArtifactRecord,
  ArtifactStatus,
  ArtifactVersionRecord,
} from "@/modules/artifacts/domain/artifact";

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export async function loadArtifactList(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  filters: { projectId?: string; status?: ArtifactStatus; query?: string } = {},
): Promise<ArtifactRecord[]> {
  let query = supabase
    .from("artifacts")
    .select(
      "id, workspace_id, project_id, conversation_id, source_message_id, task_id, created_by_agent_id, reviewer_agent_id, title, artifact_type, language, file_path, status, current_version_number, review_note, approved_at, archived_at, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.status) query = query.eq("status", filters.status);
  else query = query.neq("status", "archived");
  if (filters.query?.trim()) query = query.ilike("title", `%${filters.query.trim()}%`);

  const { data, error } = await query;
  if (error) throw new Error(`No pudimos cargar los artefactos: ${error.message}`);
  const artifacts = (data ?? []) as ArtifactRecord[];
  if (!artifacts.length) return [];

  const projectIds = unique(artifacts.map((item) => item.project_id));
  const taskIds = unique(artifacts.map((item) => item.task_id));
  const agentIds = unique(
    artifacts.flatMap((item) => [item.created_by_agent_id, item.reviewer_agent_id]),
  );
  const [projectResult, taskResult, agentResult, versionResult] = await Promise.all([
    supabase.from("projects").select("id, name, color").eq("workspace_id", workspaceId).in("id", projectIds),
    taskIds.length
      ? supabase.from("tasks").select("id, title, status").eq("workspace_id", workspaceId).in("id", taskIds)
      : Promise.resolve({ data: [], error: null }),
    agentIds.length
      ? supabase.from("agents").select("id, name, role, icon, color").eq("workspace_id", workspaceId).in("id", agentIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("artifact_versions")
      .select("id, artifact_id, version_number, content, change_summary, content_checksum, source_message_id, created_by_agent_id, created_at")
      .eq("workspace_id", workspaceId)
      .in("artifact_id", artifacts.map((item) => item.id)),
  ]);

  const projectRows = (projectResult.data ?? []) as Array<{ id: string; name: string; color: string }>;
  const taskRows = (taskResult.data ?? []) as Array<{ id: string; title: string; status: string }>;
  const projects = new Map<string, { id: string; name: string; color: string }>(projectRows.map((row) => [row.id, row]));
  const tasks = new Map<string, { id: string; title: string; status: string }>(taskRows.map((row) => [row.id, row]));
  const agents = new Map(
    ((agentResult.data ?? []) as unknown as ArtifactAgent[]).map((row) => [row.id, row]),
  );
  const versions = new Map<string, ArtifactVersionRecord>();
  for (const raw of (versionResult.data ?? []) as ArtifactVersionRecord[]) {
    const current = versions.get(raw.artifact_id);
    if (!current || raw.version_number > current.version_number) versions.set(raw.artifact_id, raw);
  }

  return artifacts.map((artifact): ArtifactRecord => ({
    ...artifact,
    project: projects.get(artifact.project_id),
    task: artifact.task_id ? tasks.get(artifact.task_id) ?? null : null,
    createdByAgent: artifact.created_by_agent_id ? agents.get(artifact.created_by_agent_id) ?? null : null,
    reviewerAgent: artifact.reviewer_agent_id ? agents.get(artifact.reviewer_agent_id) ?? null : null,
    currentVersion: versions.get(artifact.id) ?? null,
  }));
}

export async function loadArtifactById(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  artifactId: string,
): Promise<{ artifact: ArtifactRecord; versions: ArtifactVersionRecord[] } | null> {
  const { data, error } = await supabase
    .from("artifacts")
    .select(
      "id, workspace_id, project_id, conversation_id, source_message_id, task_id, created_by_agent_id, reviewer_agent_id, title, artifact_type, language, file_path, status, current_version_number, review_note, approved_at, archived_at, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId)
    .eq("id", artifactId)
    .maybeSingle();
  if (error) throw new Error(`No pudimos consultar el artefacto: ${error.message}`);
  if (!data) return null;
  const artifact = data as ArtifactRecord;

  const [projectResult, taskResult, agentResult, versionResult] = await Promise.all([
    supabase.from("projects").select("id, name, color").eq("workspace_id", workspaceId).eq("id", artifact.project_id).maybeSingle(),
    artifact.task_id
      ? supabase.from("tasks").select("id, title, status").eq("workspace_id", workspaceId).eq("id", artifact.task_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("agents").select("id, name, role, icon, color").eq("workspace_id", workspaceId),
    supabase
      .from("artifact_versions")
      .select("id, artifact_id, version_number, content, change_summary, content_checksum, source_message_id, created_by_agent_id, created_at")
      .eq("workspace_id", workspaceId)
      .eq("artifact_id", artifact.id)
      .order("version_number", { ascending: false }),
  ]);

  const agents = new Map(
    ((agentResult.data ?? []) as unknown as ArtifactAgent[]).map((row) => [row.id, row]),
  );
  const versions = ((versionResult.data ?? []) as ArtifactVersionRecord[]).map((version) => ({
    ...version,
    createdByAgent: version.created_by_agent_id ? agents.get(version.created_by_agent_id) ?? null : null,
  }));

  return {
    artifact: {
      ...artifact,
      project: (projectResult.data as { id: string; name: string; color: string } | null) ?? undefined,
      task: (taskResult.data as { id: string; title: string; status: string } | null) ?? null,
      createdByAgent: artifact.created_by_agent_id ? agents.get(artifact.created_by_agent_id) ?? null : null,
      reviewerAgent: artifact.reviewer_agent_id ? agents.get(artifact.reviewer_agent_id) ?? null : null,
      currentVersion: versions[0] ?? null,
    },
    versions,
  };
}

export async function loadArtifactFormOptions(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
) {
  const [projects, tasks, agents] = await Promise.all([
    supabase.from("projects").select("id, name, color").eq("workspace_id", workspaceId).neq("status", "archived").order("name"),
    supabase.from("tasks").select("id, project_id, title, status").eq("workspace_id", workspaceId).neq("status", "archived").order("updated_at", { ascending: false }).limit(300),
    supabase.from("project_agents").select("project_id, agent_id, agents(id, name, role, icon, color)").eq("workspace_id", workspaceId).eq("status", "active"),
  ]);
  const agentRows: Array<ArtifactAgent & { projectIds: string[] }> = [];
  const map = new Map<string, ArtifactAgent & { projectIds: string[] }>();
  for (const row of (agents.data ?? []) as unknown as Array<{ project_id: string; agent_id: string; agents: ArtifactAgent | ArtifactAgent[] | null }>) {
    const raw = Array.isArray(row.agents) ? row.agents[0] : row.agents;
    if (!raw) continue;
    const current = map.get(row.agent_id);
    if (current) current.projectIds.push(row.project_id);
    else map.set(row.agent_id, { ...raw, projectIds: [row.project_id] });
  }
  agentRows.push(...map.values());
  return {
    projects: projects.data ?? [],
    tasks: tasks.data ?? [],
    agents: agentRows,
  };
}

export async function loadSourceMessage(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  messageId: string,
) {
  const { data: message } = await supabase
    .from("messages")
    .select("id, conversation_id, agent_id, content, role")
    .eq("id", messageId)
    .maybeSingle();
  if (!message) return null;
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, project_id, workspace_id")
    .eq("id", message.conversation_id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!conversation) return null;
  return {
    id: message.id,
    conversationId: message.conversation_id,
    agentId: message.agent_id,
    content: message.content,
    role: message.role,
    projectId: conversation.project_id,
  };
}
