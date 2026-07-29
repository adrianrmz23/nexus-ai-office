import type { CurrentWorkspaceContext } from "@/modules/workspaces/application/require-current-workspace";
import type {
  TaskAgent,
  TaskAgentOption,
  TaskDependencyOption,
  TaskProjectOption,
  TaskRecord,
  TaskStatus,
} from "@/modules/tasks/domain/task";

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export async function loadTaskFormOptions(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
): Promise<{
  projects: TaskProjectOption[];
  agents: TaskAgentOption[];
  dependencies: TaskDependencyOption[];
}> {
  const [projectResult, assignmentResult, taskResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, color")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived")
      .order("name"),
    supabase
      .from("project_agents")
      .select("project_id, agent_id, agents(id, name, role, icon, color)")
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
    supabase
      .from("tasks")
      .select("id, project_id, title, status")
      .eq("workspace_id", workspaceId)
      .not("status", "in", "(archived,cancelled)")
      .order("updated_at", { ascending: false })
      .limit(300),
  ]);

  const agentMap = new Map<string, TaskAgentOption>();
  for (const row of (assignmentResult.data ?? []) as unknown as Array<{
    project_id: string;
    agent_id: string;
    agents: TaskAgent | TaskAgent[] | null;
  }>) {
    const rawAgent = Array.isArray(row.agents) ? row.agents[0] : row.agents;
    if (!rawAgent) continue;
    const current = agentMap.get(row.agent_id);
    if (current) {
      if (!current.projectIds.includes(row.project_id)) current.projectIds.push(row.project_id);
    } else {
      agentMap.set(row.agent_id, { ...rawAgent, projectIds: [row.project_id] });
    }
  }

  return {
    projects: (projectResult.data ?? []) as TaskProjectOption[],
    agents: [...agentMap.values()].sort((left, right) => left.name.localeCompare(right.name)),
    dependencies: (taskResult.data ?? []).map((row) => ({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      status: row.status as TaskStatus,
    })),
  };
}

export async function loadTaskBoard(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  filters: { projectId?: string; query?: string; includeArchived?: boolean } = {},
): Promise<TaskRecord[]> {
  let query = supabase
    .from("tasks")
    .select(
      "id, workspace_id, project_id, conversation_id, source_message_id, assigned_agent_id, created_by_agent_id, title, description, acceptance_criteria, status, priority, progress, due_date, completed_at, archived_at, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(300);

  if (!filters.includeArchived) query = query.neq("status", "archived");
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.query?.trim()) query = query.ilike("title", `%${filters.query.trim()}%`);

  const { data, error } = await query;
  if (error) throw new Error(`No pudimos cargar las tareas: ${error.message}`);
  const tasks = (data ?? []) as TaskRecord[];
  if (!tasks.length) return tasks;

  const projectIds = unique(tasks.map((task) => task.project_id));
  const agentIds = unique(
    tasks.flatMap((task) => [task.assigned_agent_id, task.created_by_agent_id]),
  );
  const taskIds = tasks.map((task) => task.id);
  const [projectResult, agentResult, dependencyResult, artifactResult] = await Promise.all([
    supabase.from("projects").select("id, name, color").eq("workspace_id", workspaceId).in("id", projectIds),
    agentIds.length
      ? supabase.from("agents").select("id, name, role, icon, color").eq("workspace_id", workspaceId).in("id", agentIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("task_dependencies")
      .select("task_id, depends_on_task_id")
      .eq("workspace_id", workspaceId)
      .in("task_id", taskIds),
    supabase.from("artifacts").select("id, task_id").eq("workspace_id", workspaceId).in("task_id", taskIds),
  ]);

  const projectRows = (projectResult.data ?? []) as TaskProjectOption[];
  const projects = new Map<string, TaskProjectOption>(projectRows.map((project) => [project.id, project]));
  const agents = new Map(
    ((agentResult.data ?? []) as unknown as TaskAgent[]).map((agent) => [agent.id, agent]),
  );
  const dependencyCounts = new Map<string, number>();
  for (const row of dependencyResult.data ?? []) {
    dependencyCounts.set(row.task_id, (dependencyCounts.get(row.task_id) ?? 0) + 1);
  }
  const artifactCounts = new Map<string, number>();
  for (const row of artifactResult.data ?? []) {
    if (!row.task_id) continue;
    artifactCounts.set(row.task_id, (artifactCounts.get(row.task_id) ?? 0) + 1);
  }

  return tasks.map((task): TaskRecord => ({
    ...task,
    project: projects.get(task.project_id),
    assignedAgent: task.assigned_agent_id ? agents.get(task.assigned_agent_id) ?? null : null,
    createdByAgent: task.created_by_agent_id ? agents.get(task.created_by_agent_id) ?? null : null,
    dependencies: Array.from({ length: dependencyCounts.get(task.id) ?? 0 }, (_, index) => ({
      id: `${task.id}-${index}`,
      title: "Dependencia",
      status: "backlog" as const,
    })),
    artifactCount: artifactCounts.get(task.id) ?? 0,
  }));
}

export async function loadTaskById(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  taskId: string,
): Promise<TaskRecord | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, workspace_id, project_id, conversation_id, source_message_id, assigned_agent_id, created_by_agent_id, title, description, acceptance_criteria, status, priority, progress, due_date, completed_at, archived_at, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId)
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw new Error(`No pudimos consultar la tarea: ${error.message}`);
  if (!data) return null;
  const task = data as TaskRecord;

  const [projectResult, agentResult, dependencyResult, artifactResult] = await Promise.all([
    supabase.from("projects").select("id, name, color").eq("workspace_id", workspaceId).eq("id", task.project_id).maybeSingle(),
    task.assigned_agent_id
      ? supabase.from("agents").select("id, name, role, icon, color").eq("workspace_id", workspaceId).eq("id", task.assigned_agent_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("task_dependencies")
      .select("depends_on_task_id")
      .eq("workspace_id", workspaceId)
      .eq("task_id", task.id),
    supabase
      .from("artifacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("task_id", task.id)
      .neq("status", "archived"),
  ]);

  const dependencyIds = (dependencyResult.data ?? []).map((row) => row.depends_on_task_id);
  let dependencies: TaskRecord["dependencies"] = [];
  if (dependencyIds.length) {
    const { data: rows } = await supabase
      .from("tasks")
      .select("id, title, status")
      .eq("workspace_id", workspaceId)
      .in("id", dependencyIds);
    dependencies = (rows ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status as TaskStatus,
    }));
  }

  return {
    ...task,
    project: (projectResult.data as TaskProjectOption | null) ?? undefined,
    assignedAgent: (agentResult.data as TaskAgent | null) ?? null,
    dependencies,
    artifactCount: artifactResult.data?.length ?? 0,
  };
}
